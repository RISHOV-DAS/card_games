/**
 * Bot helpers for Twenty-Nine.
 */

import {
  MAX_BID,
  MIN_BID,
  SUITS,
  calculateTrickWinner,
  getCardPoints,
  getCardStrength,
  getCardSuit,
  getPlayerTeam,
  getValidPlays,
} from './gameLogic.js';

export function getBotBid(hand, gameState, difficulty = 'medium') {
  const suitScores = scoreSuits(hand);
  const strongestSuit = Object.values(suitScores).sort((a, b) => b.score - a.score)[0];
  const currentBid = gameState.bid.highestBid;
  const minimumAllowedBid = currentBid === null ? MIN_BID : currentBid + 1;

  if (minimumAllowedBid > MAX_BID) {
    return null;
  }

  const confidence = strongestSuit.score;

  if (difficulty === 'easy') {
    return confidence >= 7 && Math.random() > 0.45 ? minimumAllowedBid : null;
  }

  if (difficulty === 'medium') {
    if (confidence < 8) {
      return null;
    }

    return Math.min(minimumAllowedBid + Math.max(0, Math.floor((confidence - 8) / 2)), 22);
  }

  if (confidence < 7) {
    return null;
  }

  return Math.min(minimumAllowedBid + Math.max(0, Math.floor((confidence - 7) / 2)), 24);
}

export function getBotTrumpDeclaration(hand) {
  const suitScores = scoreSuits(hand);

  return Object.values(suitScores).sort((a, b) => b.score - a.score)[0]?.suit || SUITS[0];
}

export function getBotCardChoice(hand, gameState, difficulty = 'medium') {
  const validPlays = getValidPlays(hand, gameState.currentTrick);

  if (!validPlays.length) {
    return hand[0] || null;
  }

  if (difficulty === 'easy') {
    return validPlays[Math.floor(Math.random() * validPlays.length)];
  }

  const orderedLowToHigh = [...validPlays].sort((left, right) => {
    const pointDelta = getCardPoints(left) - getCardPoints(right);

    if (pointDelta !== 0) {
      return pointDelta;
    }

    return getCardStrength(left) - getCardStrength(right);
  });

  const winningPlays = orderedLowToHigh.filter((card) => {
    const projectedWinner = calculateTrickWinner(
      [...gameState.currentTrick, { playerId: gameState.currentPlayerId, card }],
      gameState.trumpSuit
    );

    return projectedWinner === gameState.currentPlayerId;
  });

  if (!gameState.currentTrick.length) {
    return difficulty === 'hard'
      ? leadBestCard(orderedLowToHigh, gameState)
      : orderedLowToHigh[0];
  }

  if (winningPlays.length > 0) {
    return winningPlays[0];
  }

  return difficulty === 'hard'
    ? discardForPartner(orderedLowToHigh, gameState)
    : orderedLowToHigh[0];
}

export async function simulateBotThinkTime(difficulty = 'medium') {
  const delays = {
    easy: 450,
    medium: 800,
    hard: 1200,
  };

  return new Promise((resolve) => {
    setTimeout(resolve, delays[difficulty] || delays.medium);
  });
}

function scoreSuits(hand) {
  return SUITS.reduce((accumulator, suit) => {
    const suitCards = hand.filter((card) => getCardSuit(card) === suit);
    const score = suitCards.reduce((total, card) => total + getCardStrength(card) + getCardPoints(card), 0);

    accumulator[suit] = {
      suit,
      cards: suitCards,
      score: score + suitCards.length,
    };

    return accumulator;
  }, {});
}

function leadBestCard(cards, gameState) {
  const ownTeam = getPlayerTeam(gameState.currentPlayerOrder);
  const highPointCard = cards.find((card) => getCardPoints(card) >= 2);

  if (ownTeam === getPlayerTeam(gameState.bidWinnerOrder) && highPointCard) {
    return highPointCard;
  }

  return cards[cards.length - 1];
}

function discardForPartner(cards, gameState) {
  const currentWinnerId = calculateTrickWinner(gameState.currentTrick, gameState.trumpSuit);
  const currentWinner = gameState.players.find((player) => player.id === currentWinnerId);

  if (currentWinner && getPlayerTeam(currentWinner.playerOrder) === getPlayerTeam(gameState.currentPlayerOrder)) {
    return cards[0];
  }

  return cards.find((card) => getCardPoints(card) === 0) || cards[0];
}
