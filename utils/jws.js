const jwt = require('jsonwebtoken');
require('dotenv').config();

const secretKey = process.env.JWT_SECRET;
if (!secretKey) throw new Error('JWT_SECRET is not defined');

const generateTempToken = (payload) => {
  return jwt.sign(payload, secretKey, { expiresIn: '1m' });
};

const verifyTempToken = (token) => {
  return jwt.verify(token, secretKey);
};

module.exports = { generateTempToken, verifyTempToken };
