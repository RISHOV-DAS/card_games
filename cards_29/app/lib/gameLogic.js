/**
 * Twenty-Nine game logic.
 */

export const SUITS = ['H', 'D', 'C', 'S'];
export const RANKS = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'];
export const GAME_PHASES = {
  INIT: 'init',
  BIDDING: 'bidding',
  TRUMP_SELECTION: 'trump_selection',
  PLAY: 'play',
  TRICK_RESOLUTION: 'trick_resolution',
  SCORING: 'scoring',
  COMPLETED: 'completed',
};

export const MIN_BID = 16;
export const MAX_BID = 28;
export const INITIAL_HAND_SIZE = 4;
export const FULL_HAND_SIZE = 8;
export const TOTAL_TRICKS = 8;
export const LAST_TRICK_BONUS = 1;

const RANK_STRENGTH = {
  J: 8,
  '9': 7,
  A: 6,
  '10': 5,
  K: 4,
  Q: 3,
  '8': 2,
  '7': 1,
};

const CARD_POINTS = {
  J: 3,
  '9': 2,
  A: 1,
  '10': 1,
  K: 0,
  Q: 0,
  '8': 0,
  '7': 0,
};

export function createDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }

  return shuffleArray(deck);
}

export function shuffleArray(array) {
  const copy = [...array];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function getCardRank(card) {
  return card.slice(0, -1);
}

export function getCardSuit(card) {
  return card.slice(-1);
}

export function getCardPoints(card) {
  return CARD_POINTS[getCardRank(card)] || 0;
}

export function getCardStrength(card) {
  return RANK_STRENGTH[getCardRank(card)] || 0;
}

export function getCardValue(card) {
  return getCardPoints(card);
}

export function createCard(card) {
  return {
    suit: getCardSuit(card),
    rank: getCardRank(card),
    points: getCardPoints(card),
    strength: getCardStrength(card),
    code: card,
  };
}

export function dealCards(deck, playerIds) {
  const hands = Object.fromEntries(playerIds.map((playerId) => [playerId, []]));
  let deckIndex = 0;

  for (let round = 0; round < FULL_HAND_SIZE; round += 1) {
    for (const playerId of playerIds) {
      hands[playerId].push(deck[deckIndex]);
      deckIndex += 1;
    }
  }

  return hands;
}

export function dealInitialHands(deck, playerIds) {
  const hands = Object.fromEntries(playerIds.map((playerId) => [playerId, []]));
  let deckIndex = 0;

  for (let round = 0; round < INITIAL_HAND_SIZE; round += 1) {
    for (const playerId of playerIds) {
      hands[playerId].push(deck[deckIndex]);
      deckIndex += 1;
    }
  }

  return {
    hands,
    nextDeckIndex: deckIndex,
  };
}

export function dealRemainingHands(deck, playerIds, hands, startIndex) {
  const nextHands = Object.fromEntries(
    playerIds.map((playerId) => [playerId, [...(hands[playerId] || [])]])
  );
  let deckIndex = startIndex;

  for (let round = INITIAL_HAND_SIZE; round < FULL_HAND_SIZE; round += 1) {
    for (const playerId of playerIds) {
      nextHands[playerId].push(deck[deckIndex]);
      deckIndex += 1;
    }
  }

  return {
    hands: nextHands,
    nextDeckIndex: deckIndex,
  };
}

export function getPlayerTeam(playerOrder) {
  return playerOrder % 2 === 1 ? 1 : 2;
}

export function getTeamKey(playerOrder) {
  return `team${getPlayerTeam(playerOrder)}`;
}

export function getNextPlayerOrder(currentOrder, totalPlayers = 4) {
  return currentOrder === totalPlayers ? 1 : currentOrder + 1;
}

export function getTrickLeadSuit(currentTrick = []) {
  if (!currentTrick.length) {
    return null;
  }

  return getCardSuit(currentTrick[0].card || currentTrick[0]);
}

export function getValidPlays(playerHand, currentTrick = []) {
  if (!currentTrick.length) {
    return [...playerHand];
  }

  const leadSuit = getTrickLeadSuit(currentTrick);
  const suitedCards = playerHand.filter((card) => getCardSuit(card) === leadSuit);

  if (suitedCards.length > 0) {
    return suitedCards;
  }

  return [...playerHand];
}

export function canRevealTrump(playerHand, currentTrick, trumpSuit, trumpRevealed) {
  if (trumpRevealed || !trumpSuit || !currentTrick.length) {
    return false;
  }

  const leadSuit = getTrickLeadSuit(currentTrick);
  const hasLeadSuit = playerHand.some((card) => getCardSuit(card) === leadSuit);
  const hasTrump = playerHand.some((card) => getCardSuit(card) === trumpSuit);

  return !hasLeadSuit && hasTrump;
}

export function isValidBid(amount, highestBid) {
  if (!Number.isInteger(amount)) {
    return false;
  }

  if (amount < MIN_BID || amount > MAX_BID) {
    return false;
  }

  if (highestBid === null) {
    return true;
  }

  return amount > highestBid;
}

export function isValidPlay({
  playedCard,
  playerHand,
  currentTrick = [],
  trumpSuit,
  trumpRevealed,
}) {
  if (!playerHand.includes(playedCard)) {
    return false;
  }

  const validPlays = getValidPlays(playerHand, currentTrick);

  if (!validPlays.includes(playedCard)) {
    return false;
  }

  if (!trumpSuit || trumpRevealed) {
    return true;
  }

  const playedSuit = getCardSuit(playedCard);

  if (playedSuit !== trumpSuit) {
    return true;
  }

  if (!currentTrick.length) {
    return true;
  }

  return canRevealTrump(playerHand, currentTrick, trumpSuit, trumpRevealed);
}

export function compareCards(cardA, cardB) {
  return getCardStrength(cardA) - getCardStrength(cardB);
}

export function getTrickWinner(currentTrick, trumpSuit) {
  if (!currentTrick.length) {
    return null;
  }

  const leadSuit = getTrickLeadSuit(currentTrick);
  const trumpCards = trumpSuit
    ? currentTrick.filter((play) => getCardSuit(play.card) === trumpSuit)
    : [];
  const eligibleCards = trumpCards.length > 0
    ? trumpCards
    : currentTrick.filter((play) => getCardSuit(play.card) === leadSuit);

  return eligibleCards.reduce((bestPlay, currentPlay) => {
    if (!bestPlay) {
      return currentPlay;
    }

    return compareCards(currentPlay.card, bestPlay.card) > 0 ? currentPlay : bestPlay;
  }, null);
}

export function calculateTrickWinner(playedCards, trumpSuit) {
  const currentTrick = Array.isArray(playedCards)
    ? playedCards
    : Object.entries(playedCards).map(([playerId, card]) => ({ playerId, card }));
  const winner = getTrickWinner(currentTrick, trumpSuit);

  return winner?.playerId || null;
}

export function calculateTrickPoints(currentTrick, isLastTrick = false) {
  const basePoints = currentTrick.reduce((total, play) => total + getCardPoints(play.card), 0);

  return isLastTrick ? basePoints + LAST_TRICK_BONUS : basePoints;
}

export function calculatePlayerPoints(tricks, includeLastTrickBonus = true) {
  return tricks.reduce((total, trick, index) => {
    const isLastTrick = includeLastTrickBonus && index === tricks.length - 1;
    return total + calculateTrickPoints(trick.cards || trick, isLastTrick);
  }, 0);
}

export function evaluateRound({
  bidAmount,
  bidWinnerOrder,
  teamPoints,
}) {
  const bidderTeam = getTeamKey(bidWinnerOrder);
  const defenderTeam = bidderTeam === 'team1' ? 'team2' : 'team1';
  const bidderPoints = teamPoints[bidderTeam] || 0;
  const bidderSucceeded = bidderPoints >= bidAmount;
  const winningTeam = bidderSucceeded ? bidderTeam : defenderTeam;

  return {
    bidderTeam,
    defenderTeam,
    bidderPoints,
    bidAmount,
    bidderSucceeded,
    winningTeam,
    gamePoints: {
      team1: winningTeam === 'team1' ? 1 : 0,
      team2: winningTeam === 'team2' ? 1 : 0,
    },
  };
}

export function getSuitSymbol(suit) {
  const symbols = {
    H: '♥',
    D: '♦',
    C: '♣',
    S: '♠',
  };

  return symbols[suit] || suit;
}

export function getSuitName(suit) {
  const names = {
    H: 'Hearts',
    D: 'Diamonds',
    C: 'Clubs',
    S: 'Spades',
  };

  return names[suit] || suit;
}
