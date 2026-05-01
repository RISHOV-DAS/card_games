/**
 * Bot AI Logic for Card 29
 */

import {
  getCardValue,
  getValidPlays,
  calculateTrickWinner,
  SUITS,
} from './gameLogic';

/**
 * Get bot's card choice
 * @param {string[]} hand - Bot's hand
 * @param {Object} gameState - Current game state
 * @param {string} difficulty - Bot difficulty (easy, medium, hard)
 * @returns {string} Card to play
 */
export function getBotCardChoice(hand, gameState, difficulty = 'medium') {
  const {
    playedCards,
    trumpSuit,
    ledSuit,
    scores,
    round,
    totalRounds,
    players,
    botId,
  } = gameState;

  const validPlays = getValidPlays(hand, playedCards, trumpSuit, ledSuit);

  if (validPlays.length === 0) return hand[0]; // Fallback

  switch (difficulty) {
    case 'easy':
      return getEasyBotCard(validPlays, gameState);
    case 'medium':
      return getMediumBotCard(validPlays, hand, gameState);
    case 'hard':
      return getHardBotCard(validPlays, hand, gameState);
    default:
      return validPlays[0];
  }
}

/**
 * Easy Bot - Random valid play
 */
function getEasyBotCard(validPlays, gameState) {
  return validPlays[Math.floor(Math.random() * validPlays.length)];
}

/**
 * Medium Bot - Strategic plays
 */
function getMediumBotCard(validPlays, hand, gameState) {
  const { playedCards, trumpSuit, ledSuit, scores } = gameState;

  // High-value cards
  const sortedByValue = validPlays.sort(
    (a, b) => getCardValue(b, trumpSuit) - getCardValue(a, trumpSuit)
  );

  // If winning current trick, play low card
  const trickWinner = calculateTrickWinner(playedCards, trumpSuit, []);
  if (trickWinner === gameState.botId) {
    return sortedByValue[sortedByValue.length - 1];
  }

  // If losing, try to throw high card (waste it)
  return sortedByValue[0];
}

/**
 * Hard Bot - Advanced strategy
 */
function getHardBotCard(validPlays, hand, gameState) {
  const { playedCards, trumpSuit, ledSuit, scores, players } = gameState;

  // Calculate current trick value
  let trickValue = 0;
  for (const card of Object.values(playedCards)) {
    trickValue += getCardValue(card, trumpSuit);
  }

  // Get cards by value
  const sortedByValue = validPlays.sort(
    (a, b) => getCardValue(b, trumpSuit) - getCardValue(a, trumpSuit)
  );

  // If we can win with minimal investment
  const canWinLow = sortedByValue.find((card) => {
    // Simple heuristic: if playing this card would win, do it
    return getCardValue(card, trumpSuit) >= getCardValue(Object.values(playedCards)[0] || '2H', trumpSuit);
  });

  if (canWinLow && Object.keys(playedCards).length > 0) {
    return canWinLow;
  }

  // Defensive play: discard lowest value cards first
  return sortedByValue[sortedByValue.length - 1];
}

/**
 * Get bot's trump declaration
 */
export function getBotTrumpDeclaration(hand, difficulty = 'medium') {
  // Count cards in each suit
  const suitCounts = {
    H: 0,
    D: 0,
    C: 0,
    S: 0,
  };

  const suitValues = {
    H: 0,
    D: 0,
    C: 0,
    S: 0,
  };

  for (const card of hand) {
    const suit = card.slice(-1);
    suitCounts[suit]++;

    // High value cards: 9=14, 10=10, J/Q/K=3, A=1
    const value = card.slice(0, -1);
    let cardValue = 0;

    if (value === '9') cardValue = 14;
    else if (value === '10') cardValue = 10;
    else if (['J', 'Q', 'K'].includes(value)) cardValue = 3;
    else if (value === 'A') cardValue = 1;
    else cardValue = parseInt(value);

    suitValues[suit] += cardValue;
  }

  // Choose suit with highest value
  let bestSuit = 'H';
  let bestValue = 0;

  for (const suit of SUITS) {
    const value = suitValues[suit] + suitCounts[suit] * 2; // Bonus for having more cards
    if (value > bestValue) {
      bestValue = value;
      bestSuit = suit;
    }
  }

  return bestSuit;
}

/**
 * Simulate bot think time for realistic gameplay
 */
export async function simulateBotThinkTime(difficulty = 'medium') {
  const times = {
    easy: Math.random() * 500 + 500,
    medium: Math.random() * 800 + 800,
    hard: Math.random() * 1500 + 1000,
  };

  return new Promise((resolve) =>
    setTimeout(resolve, times[difficulty] || 800)
  );
}
