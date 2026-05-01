import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // Room state
  roomId: null,
  roomCode: null,
  roomStatus: 'waiting', // waiting, in_progress, completed
  players: [],
  hostId: null,
  maxPlayers: 4,

  // Game state
  currentRound: 0,
  currentTurn: 0,
  gameStatus: 'waiting', // waiting, playing, finished
  trumpSuit: null,
  trumpCard: null,
  dealerOrder: 1,

  // Player state
  currentPlayerId: null,
  playerHand: [],
  playedCards: {},
  scores: {},

  // Game flow
  roundWinner: null,
  gameWinner: null,
  isLoading: false,
  error: null,

  /**
   * Initialize room
   */
  setRoom: (roomData) => {
    set({
      roomId: roomData.id,
      roomCode: roomData.code,
      roomStatus: roomData.status,
      hostId: roomData.hostId,
      maxPlayers: roomData.maxPlayers,
    });
  },

  /**
   * Set players in room
   */
  setPlayers: (players) => {
    set({ players });
  },

  /**
   * Add player to room
   */
  addPlayer: (player) => {
    set((state) => ({
      players: [...state.players, player],
    }));
  },

  /**
   * Remove player from room
   */
  removePlayer: (playerId) => {
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    }));
  },

  /**
   * Start game
   */
  startGame: (gameData) => {
    set({
      gameStatus: 'playing',
      roomStatus: 'in_progress',
      currentRound: 1,
      currentTurn: 0,
      trumpSuit: gameData.trumpSuit,
      trumpCard: gameData.trumpCard,
      dealerOrder: gameData.dealerOrder,
    });
  },

  /**
   * Set player hand
   */
  setPlayerHand: (hand) => {
    set({ playerHand: hand });
  },

  /**
   * Play card
   */
  playCard: (card, playerId) => {
    set((state) => {
      const newHand = state.playerHand.filter((c) => c !== card);
      return {
        playerHand: newHand,
        playedCards: {
          ...state.playedCards,
          [playerId]: card,
        },
      };
    });
  },

  /**
   * Set current turn
   */
  setCurrentTurn: (playerId) => {
    set({ currentTurn: playerId });
  },

  /**
   * Update scores
   */
  updateScores: (scores) => {
    set({ scores });
  },

  /**
   * End round
   */
  endRound: (roundWinner, newScores) => {
    set({
      roundWinner,
      scores: newScores,
      playedCards: {},
      currentRound: get().currentRound + 1,
    });
  },

  /**
   * End game
   */
  endGame: (gameWinner, finalScores) => {
    set({
      gameStatus: 'finished',
      roomStatus: 'completed',
      gameWinner,
      scores: finalScores,
    });
  },

  /**
   * Reset game state
   */
  resetGame: () => {
    set({
      roomId: null,
      roomCode: null,
      roomStatus: 'waiting',
      players: [],
      hostId: null,
      currentRound: 0,
      currentTurn: 0,
      gameStatus: 'waiting',
      trumpSuit: null,
      trumpCard: null,
      dealerOrder: 1,
      currentPlayerId: null,
      playerHand: [],
      playedCards: {},
      scores: {},
      roundWinner: null,
      gameWinner: null,
      error: null,
    });
  },

  /**
   * Set error
   */
  setError: (error) => {
    set({ error });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));
