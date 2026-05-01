/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const rooms = new Map();
const playerSockets = new Map();

(async () => {
  const gameLogic = await import('./app/lib/gameLogic.js');
  const botAI = await import('./app/lib/botAI.js');

  const {
    GAME_PHASES,
    MAX_BID,
    MIN_BID,
    TOTAL_TRICKS,
    SUITS,
    calculateTrickPoints,
    canRevealTrump,
    createDeck,
    dealInitialHands,
    dealRemainingHands,
    evaluateRound,
    getNextPlayerOrder,
    getPlayerTeam,
    getTeamKey,
    getTrickLeadSuit,
    getTrickWinner,
    getValidPlays,
    getCardSuit,
    isValidBid,
    isValidPlay,
  } = gameLogic;
  const {
    getBotBid,
    getBotCardChoice,
    getBotTrumpDeclaration,
    simulateBotThinkTime,
  } = botAI;

  const app = next({ dev, dir: __dirname, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('room:join', ({ roomId, userId, username }) => {
      if (!roomId || !userId) {
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;
      playerSockets.set(userId, socket.id);

      io.to(roomId).emit('room:player-joined', {
        id: userId,
        userId,
        username,
        isBot: false,
      });

      const roomState = rooms.get(roomId);
      if (roomState) {
        emitGameState(io, roomState);
      }
    });

    socket.on('game:request-state', ({ roomId, userId }) => {
      const roomState = rooms.get(roomId);

      if (!roomState) {
        return;
      }

      const socketId = playerSockets.get(userId);
      if (socketId) {
        io.to(socketId).emit('game:state', buildViewState(roomState, userId));
      }
    });

    socket.on('game:add-bot', ({ roomId, difficulty }) => {
      io.to(roomId).emit('game:bot-added', {
        id: `bot-${Date.now()}`,
        isBot: true,
        botDifficulty: difficulty,
        username: `Bot ${difficulty}`,
      });
    });

    socket.on('game:start', ({ roomId, roomCode, players }) => {
      try {
        const normalizedPlayers = normalizePlayers(players);

        if (normalizedPlayers.length !== 4) {
          emitGameError(io, roomId, null, 'Twenty-Nine needs exactly 4 players.');
          return;
        }

        const roomState = createGameState(roomId, roomCode, normalizedPlayers);
        rooms.set(roomId, roomState);

        io.to(roomId).emit('game:started', {
          roomId,
          roomCode: roomState.roomCode,
        });

        emitGameState(io, roomState);
        maybeRunBotTurn(io, roomState.roomId);
      } catch (error) {
        console.error('Failed to start game:', error);
        emitGameError(io, roomId, null, 'Failed to start the game.');
      }
    });

    socket.on('game:bid', ({ roomId, userId, amount, pass }) => {
      const roomState = rooms.get(roomId);

      if (!roomState) {
        emitGameError(io, roomId, userId, 'Game not found.');
        return;
      }

      handleBid(io, roomState, userId, pass ? null : Number(amount));
    });

    socket.on('game:select-trump', ({ roomId, userId, suit }) => {
      const roomState = rooms.get(roomId);

      if (!roomState) {
        emitGameError(io, roomId, userId, 'Game not found.');
        return;
      }

      handleTrumpSelection(io, roomState, userId, suit);
    });

    socket.on('game:play-card', ({ roomId, userId, card }) => {
      const roomState = rooms.get(roomId);

      if (!roomState) {
        emitGameError(io, roomId, userId, 'Game not found.');
        return;
      }

      handleCardPlay(io, roomState, userId, card);
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);

      for (const [userId, socketId] of playerSockets.entries()) {
        if (socketId !== socket.id) {
          continue;
        }

        playerSockets.delete(userId);
        if (socket.data.roomId) {
          io.to(socket.data.roomId).emit('room:player-left', { playerId: userId });
        }
        break;
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  server.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.io server running');
  });

  function createGameState(roomId, roomCode, players) {
    const orderedPlayers = [...players].sort((left, right) => left.playerOrder - right.playerOrder);
    const playerIds = orderedPlayers.map((player) => player.id);
    const deck = createDeck();
    const { hands, nextDeckIndex } = dealInitialHands(deck, playerIds);
    const dealerOrder = 1;
    const biddingStarterOrder = getNextPlayerOrder(dealerOrder, orderedPlayers.length);

    return {
      roomId,
      roomCode: roomCode || roomId,
      players: orderedPlayers,
      phase: GAME_PHASES.BIDDING,
      dealerOrder,
      deck,
      deckIndex: nextDeckIndex,
      hands,
      currentTurnPlayerId: getPlayerByOrder(orderedPlayers, biddingStarterOrder).id,
      currentTrick: [],
      completedTricks: [],
      trickNumber: 1,
      trumpSuit: null,
      trumpRevealed: false,
      bidWinnerId: null,
      bidWinnerOrder: null,
      teamPoints: {
        team1: 0,
        team2: 0,
      },
      gamePoints: {
        team1: 0,
        team2: 0,
      },
      bid: {
        minimumBid: MIN_BID,
        maximumBid: MAX_BID,
        highestBid: null,
        highestBidderId: null,
        highestBidderOrder: null,
        passes: [],
        history: [],
      },
      result: null,
      lastTrickSummary: null,
    };
  }

  function normalizePlayers(players = []) {
    const seen = new Set();

    return players
      .map((player, index) => {
        const id = player.user?.id || player.userId || player.id;

        if (!id || seen.has(id)) {
          return null;
        }

        seen.add(id);

        const playerOrder = player.playerOrder || index + 1;

        return {
          id,
          username: player.user?.username || player.username || `Player ${playerOrder}`,
          isBot: Boolean(player.isBot),
          botDifficulty: player.botDifficulty || 'medium',
          playerOrder,
          team: getPlayerTeam(playerOrder),
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.playerOrder - right.playerOrder);
  }

  function getPlayerByOrder(players, playerOrder) {
    return players.find((player) => player.playerOrder === playerOrder);
  }

  function getPlayerById(roomState, playerId) {
    return roomState.players.find((player) => player.id === playerId);
  }

  function getNextBiddingPlayer(roomState, playerOrder) {
    for (let offset = 1; offset <= roomState.players.length; offset += 1) {
      const nextOrder = ((playerOrder - 1 + offset) % roomState.players.length) + 1;
      const nextPlayer = getPlayerByOrder(roomState.players, nextOrder);

      if (!roomState.bid.passes.includes(nextPlayer.id)) {
        return nextPlayer;
      }
    }

    return null;
  }

  function buildViewState(roomState, viewerId) {
    const viewer = getPlayerById(roomState, viewerId);
    const playerHand = viewer ? [...(roomState.hands[viewerId] || [])] : [];
    const visibleTrumpSuit = roomState.trumpRevealed || viewerId === roomState.bidWinnerId
      ? roomState.trumpSuit
      : null;

    return {
      roomId: roomState.roomId,
      roomCode: roomState.roomCode,
      phase: roomState.phase,
      players: roomState.players,
      dealerOrder: roomState.dealerOrder,
      currentTurnPlayerId: roomState.currentTurnPlayerId,
      currentPlayerId: viewerId,
      currentPlayerOrder: viewer?.playerOrder || null,
      playerHand,
      handSizes: Object.fromEntries(
        roomState.players.map((player) => [player.id, roomState.hands[player.id]?.length || 0])
      ),
      currentTrick: roomState.currentTrick,
      leadSuit: getTrickLeadSuit(roomState.currentTrick),
      trickNumber: roomState.trickNumber,
      completedTricks: roomState.completedTricks,
      trumpSuit: visibleTrumpSuit,
      trumpRevealed: roomState.trumpRevealed,
      bidWinnerId: roomState.bidWinnerId,
      bidWinnerOrder: roomState.bidWinnerOrder,
      bid: roomState.bid,
      teamPoints: roomState.teamPoints,
      gamePoints: roomState.gamePoints,
      result: roomState.result,
      lastTrickSummary: roomState.lastTrickSummary,
      validPlays: roomState.phase === GAME_PHASES.PLAY && roomState.currentTurnPlayerId === viewerId
        ? getValidPlays(playerHand, roomState.currentTrick)
        : [],
      canRevealTrump: roomState.phase === GAME_PHASES.PLAY && roomState.currentTurnPlayerId === viewerId
        ? canRevealTrump(playerHand, roomState.currentTrick, roomState.trumpSuit, roomState.trumpRevealed)
        : false,
    };
  }

  function emitGameState(ioServer, roomState) {
    roomState.players.forEach((player) => {
      if (player.isBot) {
        return;
      }

      const socketId = playerSockets.get(player.id);
      if (!socketId) {
        return;
      }

      ioServer.to(socketId).emit('game:state', buildViewState(roomState, player.id));
    });
  }

  function emitGameError(ioServer, roomId, userId, message) {
    if (userId) {
      const socketId = playerSockets.get(userId);
      if (socketId) {
        ioServer.to(socketId).emit('game:error', { message });
        return;
      }
    }

    ioServer.to(roomId).emit('game:error', { message });
  }

  function finalizeBidding(ioServer, roomState, fallbackPlayer) {
    const activePlayers = roomState.players.filter(
      (player) => !roomState.bid.passes.includes(player.id)
    );

    if (roomState.bid.highestBid === MAX_BID && roomState.bid.highestBidderId) {
      return setBidWinner(ioServer, roomState, roomState.bid.highestBidderId, roomState.bid.highestBid);
    }

    if (activePlayers.length > 1) {
      return false;
    }

    if (!roomState.bid.highestBidderId) {
      const forcedWinner = activePlayers[0] || fallbackPlayer;
      roomState.bid.highestBid = MIN_BID;
      roomState.bid.highestBidderId = forcedWinner.id;
      roomState.bid.highestBidderOrder = forcedWinner.playerOrder;
      roomState.bid.history.push({
        playerId: forcedWinner.id,
        amount: MIN_BID,
        pass: false,
        forced: true,
      });
    }

    return setBidWinner(ioServer, roomState, roomState.bid.highestBidderId, roomState.bid.highestBid);
  }

  function setBidWinner(ioServer, roomState, playerId, amount) {
    const winner = getPlayerById(roomState, playerId);

    roomState.bidWinnerId = winner.id;
    roomState.bidWinnerOrder = winner.playerOrder;
    roomState.phase = GAME_PHASES.TRUMP_SELECTION;
    roomState.currentTurnPlayerId = winner.id;
    roomState.bid.highestBid = amount;
    roomState.bid.highestBidderId = winner.id;
    roomState.bid.highestBidderOrder = winner.playerOrder;

    emitGameState(ioServer, roomState);
    maybeRunBotTurn(ioServer, roomState.roomId);
    return true;
  }

  function handleBid(ioServer, roomState, userId, amount) {
    if (roomState.phase !== GAME_PHASES.BIDDING) {
      emitGameError(ioServer, roomState.roomId, userId, 'Bidding is not active.');
      return;
    }

    if (roomState.currentTurnPlayerId !== userId) {
      emitGameError(ioServer, roomState.roomId, userId, 'It is not your turn to bid.');
      return;
    }

    const player = getPlayerById(roomState, userId);

    if (amount === null) {
      if (!roomState.bid.passes.includes(userId)) {
        roomState.bid.passes.push(userId);
      }

      roomState.bid.history.push({
        playerId: userId,
        amount: null,
        pass: true,
      });
    } else {
      if (!isValidBid(amount, roomState.bid.highestBid)) {
        emitGameError(ioServer, roomState.roomId, userId, 'Bid must be higher than the current bid and between 16 and 28.');
        return;
      }

      roomState.bid.highestBid = amount;
      roomState.bid.highestBidderId = userId;
      roomState.bid.highestBidderOrder = player.playerOrder;
      roomState.bid.history.push({
        playerId: userId,
        amount,
        pass: false,
      });
    }

    if (finalizeBidding(ioServer, roomState, player)) {
      return;
    }

    const nextPlayer = getNextBiddingPlayer(roomState, player.playerOrder);
    roomState.currentTurnPlayerId = nextPlayer.id;
    emitGameState(ioServer, roomState);
    maybeRunBotTurn(ioServer, roomState.roomId);
  }

  function handleTrumpSelection(ioServer, roomState, userId, suit) {
    if (roomState.phase !== GAME_PHASES.TRUMP_SELECTION) {
      emitGameError(ioServer, roomState.roomId, userId, 'Trump cannot be selected right now.');
      return;
    }

    if (roomState.bidWinnerId !== userId) {
      emitGameError(ioServer, roomState.roomId, userId, 'Only the bid winner can choose trump.');
      return;
    }

    if (!SUITS.includes(suit)) {
      emitGameError(ioServer, roomState.roomId, userId, 'Invalid trump suit.');
      return;
    }

    const playerIds = roomState.players.map((player) => player.id);
    const { hands, nextDeckIndex } = dealRemainingHands(
      roomState.deck,
      playerIds,
      roomState.hands,
      roomState.deckIndex
    );

    roomState.hands = hands;
    roomState.deckIndex = nextDeckIndex;
    roomState.trumpSuit = suit;
    roomState.trumpRevealed = false;
    roomState.phase = GAME_PHASES.PLAY;
    roomState.currentTurnPlayerId = getPlayerByOrder(
      roomState.players,
      getNextPlayerOrder(roomState.dealerOrder, roomState.players.length)
    ).id;

    emitGameState(ioServer, roomState);
    maybeRunBotTurn(ioServer, roomState.roomId);
  }

  function handleCardPlay(ioServer, roomState, userId, card) {
    if (roomState.phase !== GAME_PHASES.PLAY) {
      emitGameError(ioServer, roomState.roomId, userId, 'Cards cannot be played right now.');
      return;
    }

    if (roomState.currentTurnPlayerId !== userId) {
      emitGameError(ioServer, roomState.roomId, userId, 'It is not your turn.');
      return;
    }

    const player = getPlayerById(roomState, userId);
    const playerHand = roomState.hands[userId] || [];

    if (!isValidPlay({
      playedCard: card,
      playerHand,
      currentTrick: roomState.currentTrick,
      trumpSuit: roomState.trumpSuit,
      trumpRevealed: roomState.trumpRevealed,
    })) {
      emitGameError(ioServer, roomState.roomId, userId, 'Invalid card play. You must follow suit when possible.');
      return;
    }

    const playedSuit = getCardSuit(card);
    const revealedByPlay = playedSuit === roomState.trumpSuit
      && (!roomState.currentTrick.length
        || canRevealTrump(playerHand, roomState.currentTrick, roomState.trumpSuit, roomState.trumpRevealed));

    roomState.hands[userId] = playerHand.filter((handCard) => handCard !== card);
    roomState.currentTrick.push({
      playerId: userId,
      card,
      playerOrder: player.playerOrder,
      revealedTrump: revealedByPlay,
    });

    if (revealedByPlay) {
      roomState.trumpRevealed = true;
    }

    if (roomState.currentTrick.length < roomState.players.length) {
      roomState.currentTurnPlayerId = getPlayerByOrder(
        roomState.players,
        getNextPlayerOrder(player.playerOrder, roomState.players.length)
      ).id;
      emitGameState(ioServer, roomState);
      maybeRunBotTurn(ioServer, roomState.roomId);
      return;
    }

    const winningPlay = getTrickWinner(roomState.currentTrick, roomState.trumpSuit);
    const winnerTeamKey = getTeamKey(winningPlay.playerOrder);
    const isLastTrick = roomState.trickNumber === TOTAL_TRICKS;
    const trickPoints = calculateTrickPoints(roomState.currentTrick, isLastTrick);

    roomState.teamPoints[winnerTeamKey] += trickPoints;
    roomState.lastTrickSummary = {
      winnerId: winningPlay.playerId,
      winnerOrder: winningPlay.playerOrder,
      points: trickPoints,
      cards: [...roomState.currentTrick],
    };
    roomState.completedTricks.push({
      trickNumber: roomState.trickNumber,
      winnerId: winningPlay.playerId,
      winnerOrder: winningPlay.playerOrder,
      points: trickPoints,
      cards: [...roomState.currentTrick],
    });

    if (isLastTrick) {
      roomState.phase = GAME_PHASES.COMPLETED;
      roomState.currentTurnPlayerId = null;
      roomState.result = evaluateRound({
        bidAmount: roomState.bid.highestBid,
        bidWinnerOrder: roomState.bidWinnerOrder,
        teamPoints: roomState.teamPoints,
      });
      roomState.gamePoints = roomState.result.gamePoints;
      emitGameState(ioServer, roomState);
      return;
    }

    roomState.phase = GAME_PHASES.TRICK_RESOLUTION;
    roomState.currentTurnPlayerId = winningPlay.playerId;
    emitGameState(ioServer, roomState);

    const resolvedTrickNumber = roomState.trickNumber;
    setTimeout(() => {
      const latestState = rooms.get(roomState.roomId);

      if (!latestState || latestState.trickNumber !== resolvedTrickNumber || latestState.phase !== GAME_PHASES.TRICK_RESOLUTION) {
        return;
      }

      latestState.currentTrick = [];
      latestState.phase = GAME_PHASES.PLAY;
      latestState.trickNumber += 1;
      emitGameState(ioServer, latestState);
      maybeRunBotTurn(ioServer, latestState.roomId);
    }, 1200);
  }

  function maybeRunBotTurn(ioServer, roomId) {
    const roomState = rooms.get(roomId);

    if (!roomState || !roomState.currentTurnPlayerId) {
      return;
    }

    const currentPlayer = getPlayerById(roomState, roomState.currentTurnPlayerId);
    if (!currentPlayer?.isBot) {
      return;
    }

    setTimeout(async () => {
      const latestState = rooms.get(roomId);

      if (!latestState || latestState.currentTurnPlayerId !== currentPlayer.id) {
        return;
      }

      await simulateBotThinkTime(currentPlayer.botDifficulty);

      const botState = rooms.get(roomId);
      if (!botState || botState.currentTurnPlayerId !== currentPlayer.id) {
        return;
      }

      if (botState.phase === GAME_PHASES.BIDDING) {
        const bidAmount = getBotBid(botState.hands[currentPlayer.id], botState, currentPlayer.botDifficulty);
        handleBid(ioServer, botState, currentPlayer.id, bidAmount);
        return;
      }

      if (botState.phase === GAME_PHASES.TRUMP_SELECTION) {
        const trumpSuit = getBotTrumpDeclaration(botState.hands[currentPlayer.id], currentPlayer.botDifficulty);
        handleTrumpSelection(ioServer, botState, currentPlayer.id, trumpSuit);
        return;
      }

      if (botState.phase === GAME_PHASES.PLAY) {
        const card = getBotCardChoice(botState.hands[currentPlayer.id], {
          currentTrick: botState.currentTrick,
          trumpSuit: botState.trumpSuit,
          players: botState.players,
          currentPlayerId: currentPlayer.id,
          currentPlayerOrder: currentPlayer.playerOrder,
          bidWinnerOrder: botState.bidWinnerOrder,
        }, currentPlayer.botDifficulty);
        handleCardPlay(ioServer, botState, currentPlayer.id, card);
      }
    }, currentPlayer.botDifficulty === 'hard' ? 250 : 0);
  }
})();
