import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

/**
 * Hash a password using bcryptjs
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(SALT_ROUNDS);
  return bcryptjs.hash(password, salt);
}

/**
 * Compare a plain text password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Password hash
 * @returns {Promise<boolean>} True if password matches hash
 */
export async function comparePassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

/**
 * Generate a JWT token
 * @param {Object} payload - Token payload
 * @param {number} expiresIn - Token expiration time in seconds (default: 7 days)
 * @returns {string} JWT token
 */
export function generateToken(payload, expiresIn = 60 * 60 * 24 * 7) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Extract user ID from token
 * @param {string} token - JWT token
 * @returns {string|null} User ID
 */
export function getUserIdFromToken(token) {
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}
