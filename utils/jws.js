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


const generateToken = (payload, expiresIn = JWT_EXPIRES_IN) => {
  return jwt.sign(
    typeof payload === 'object' ? payload : { id: payload },
    JWT_SECRET,
    { expiresIn }
  );
};


const generateTempToken = (payload) => {
  return generateToken(payload, TEMP_TOKEN_EXPIRES_IN);
};


const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Alias for verifyToken to maintain consistency
const verifyTempToken = verifyToken;


const decodeToken = (token) => {
  return jwt.decode(token);
};


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