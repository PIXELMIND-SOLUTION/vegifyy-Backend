const jwt = require('jsonwebtoken');
require('dotenv').config();

// Separate secrets for clarity
const AUTH_SECRET = process.env.ADMIN_SECRET || 'SUPER_SECRET_KEY';
const COUPON_SECRET = process.env.COUPON_SECRET || 'SUPER_COUPON_SECRET';

// --- OTP Token ---
exports.generateTempToken = (payload) => {
  return jwt.sign(payload, AUTH_SECRET, { expiresIn: '2m' }); // OTP valid for 2 minutes
};

exports.verifyTempToken = (token) => {
  try {
    return jwt.verify(token, AUTH_SECRET);
  } catch (err) {
    return null;
  }
};

// --- Login/Auth Token ---
exports.generateAuthToken = (payload) => {
  return jwt.sign(payload, AUTH_SECRET, { expiresIn: '1d' }); // session valid for 1 day
};

exports.authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, AUTH_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// --- Coupon Token ---
exports.generateCouponToken = () => {
  if (!COUPON_SECRET) throw new Error("COUPON_SECRET not defined in .env");
  return jwt.sign({ role: 'coupon' }, COUPON_SECRET, { expiresIn: '1h' });
};

exports.couponAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ success: false, message: "No coupon token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    req.coupon = jwt.verify(token, COUPON_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired coupon token." });
  }
};
