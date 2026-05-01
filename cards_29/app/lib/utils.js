/**
 * Utility functions for the Card 29 game
 */

import { nanoid } from 'nanoid';

/**
 * Generate a unique room code (6 characters, alphanumeric)
 * @returns {string} Room code
 */
export function generateRoomCode() {
  return nanoid(6).toUpperCase();
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid username
 */
export function isValidUsername(username) {
  if (!username || username.trim().length === 0) return false;
  if (username.length > 20) return false;
  return /^[a-zA-Z0-9_-]+$/.test(username);
}

/**
 * Format error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Object} Formatted error object
 */
export function formatError(message, status = 400) {
  return {
    error: message,
    status,
  };
}

/**
 * Format success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Formatted success object
 */
export function formatSuccess(data, message = 'Success') {
  return {
    data,
    message,
    status: 200,
  };
}

/**
 * Get card value for scoring (Card 29 rules)
 * @param {string} card - Card notation (e.g., "JH", "10S")
 * @returns {number} Card value in points
 */
export function getCardValue(card) {
  const value = card.slice(0, -1);

  const baseValues = {
    'A': 1,
    '7': 0,
    '8': 0,
    '9': 2,
    '10': 1,
    'J': 3,
    'Q': 0,
    'K': 0,
  };

  return baseValues[value] || 0;
}

/**
 * Sleep utility for async delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
