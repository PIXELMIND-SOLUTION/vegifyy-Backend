const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const TEMP_TOKEN_EXPIRES_IN = '1m'; // For temporary tokens

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

/**
 * Generate JWT token
 * @param {string|Object} payload - User ID or payload object
 * @param {string} [expiresIn=JWT_EXPIRES_IN] - Token expiration time
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
  return jwt.sign(
    typeof payload === 'object' ? payload : { id: payload },
    JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Generate temporary short-lived token (1 minute)
 * @param {string|Object} payload - User ID or payload object
 * @returns {string} Temporary JWT token
 */
const generateTempToken = (payload) => {
  return generateToken(payload, TEMP_TOKEN_EXPIRES_IN);
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Alias for verifyToken to maintain consistency
const verifyTempToken = verifyToken;

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Get token from request headers
 * @param {Object} req - Express request object
 * @returns {string|null} Token if found, null otherwise
 */
const getTokenFromHeader = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

module.exports = {
  generateToken,
  generateTempToken,
  verifyToken,
  verifyTempToken,
  decodeToken,
  getTokenFromHeader,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  TEMP_TOKEN_EXPIRES_IN
};