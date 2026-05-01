/**
 * Card 29 Game Logic
 * 
 * Rules:
 * - 4 players
 * - Standard 52-card deck
 * - Points: A=1, 2-9=face value, 10/J/Q/K=0 (except trump)
 * - In trump suit: 9=14, 10=10, J=3, Q=3, K=3, A=1
 * - Total points in deck: 28 (so 29 is declared)
 * - First to reach 52 points wins (or highest score after all deals)
 */

export const SUITS = ['H', 'D', 'C', 'S']; // Hearts, Diamonds, Clubs, Spades
export const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Create a shuffled deck
 */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push(`${value}${suit}`);
    }
  }
  return shuffleArray(deck);
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deal cards to 4 players (8 cards each)
 */
export function dealCards(deck) {
  const hands = [[], [], [], []];
  for (let i = 0; i < 32; i++) {
    hands[i % 4].push(deck[i]);
  }
  const trumpCard = deck[32];
  return { hands, trumpCard };
}

/**
 * Get card value for scoring
 */
export function getCardValue(card, trumpSuit) {
  const value = card.slice(0, -1);
  const suit = card.slice(-1);

  const baseValues = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 0, 'Q': 0, 'K': 0,
  };

  let points = baseValues[value];

  // Trump suit special values
  if (suit === trumpSuit) {
    if (value === '9') return 14;
    if (value === '10') return 10;
    if (value === 'J') return 3;
    if (value === 'Q') return 3;
    if (value === 'K') return 3;
    if (value === 'A') return 1;
  }

  return points;
}

/**
 * Calculate round winner and points
 * Trick is won by: highest trump > highest card of led suit > any other
 */
export function calculateTrickWinner(playedCards, trumpSuit, playerOrder) {
  // playedCards: { playerId: card }
  // playerOrder: array of player IDs in order

  if (Object.keys(playedCards).length === 0) return null;

  const cards = Object.entries(playedCards);
  const firstCard = cards[0][1];
  const ledSuit = firstCard.slice(-1);

  let winner = cards[0][0];
  let winningCard = firstCard;

  for (let i = 1; i < cards.length; i++) {
    const [playerId, card] = cards[i];
    const suit = card.slice(-1);

    if (suit === trumpSuit) {
      if (winningCard.slice(-1) !== trumpSuit) {
        winner = playerId;
        winningCard = card;
      } else {
        // Both trump - compare values
        if (compareCards(card, winningCard, trumpSuit) > 0) {
          winner = playerId;
          winningCard = card;
        }
      }
    } else if (suit === ledSuit && winningCard.slice(-1) !== trumpSuit) {
      if (compareCards(card, winningCard, trumpSuit) > 0) {
        winner = playerId;
        winningCard = card;
      }
    }
  }

  return winner;
}

/**
 * Compare two cards (return 1 if first is higher, -1 if second is higher)
 */
function compareCards(card1, card2, trumpSuit) {
  const value1 = card1.slice(0, -1);
  const value2 = card2.slice(0, -1);

  const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const idx1 = rankOrder.indexOf(value1);
  const idx2 = rankOrder.indexOf(value2);

  return idx1 > idx2 ? 1 : -1;
}

/**
 * Calculate total points for a player's tricks
 */
export function calculatePlayerPoints(tricks, trumpSuit) {
  let points = 0;
  for (const cards of Object.values(tricks)) {
    for (const card of cards) {
      points += getCardValue(card, trumpSuit);
    }
  }
  return points;
}

/**
 * Check if a play is valid (following suit rule, throwing trump if can't follow)
 */
export function isValidPlay(
  playedCard,
  playerHand,
  playedCards,
  trumpSuit,
  ledSuit
) {
  // If no cards played yet, any card is valid
  if (Object.keys(playedCards).length === 0) return true;

  const cardSuit = playedCard.slice(-1);

  // Must follow led suit if possible
  const hasSuitCard = playerHand.some(
    (card) => card.slice(-1) === ledSuit
  );

  if (hasSuitCard && cardSuit !== ledSuit) {
    return false;
  }

  return true;
}

/**
 * Get valid plays for a player
 */
export function getValidPlays(playerHand, playedCards, trumpSuit, ledSuit) {
  if (Object.keys(playedCards).length === 0) return playerHand;

  const validPlays = [];

  // Try to follow suit
  const suitCards = playerHand.filter(
    (card) => card.slice(-1) === ledSuit
  );

  if (suitCards.length > 0) {
    return suitCards;
  }

  // If can't follow, must throw trump if possible
  const trumpCards = playerHand.filter(
    (card) => card.slice(-1) === trumpSuit
  );

  if (trumpCards.length > 0) {
    return trumpCards;
  }

  // Otherwise any card
  return playerHand;
}
