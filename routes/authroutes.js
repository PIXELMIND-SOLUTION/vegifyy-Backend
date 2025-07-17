const express = require('express');
const router = express.Router();

const {
  register,
  verifyOtp,
  setPassword,
  login,
  sendForgotOtp,
  verifyForgotOtp,
  resetForgotPassword,
  getProfile,
  updateProfile,
  deleteProfile,
  addAddress,
  getAddress,
  updateAddress,
  deleteAddress, 
  postLocation,
  updateLocation,
  getLocation,
  getReferralByUserId,
  
} = require('../controllers/userController');

// 🔐 Authentication Flow
router.post('/register', register);              // Step 1: Register with referralCode (optional)
router.post('/verify-otp', verifyOtp);           // Step 2: OTP verification (fixed OTP 1234)
router.post('/set-password/:userId', setPassword);       // Step 3: Set password after OTP
router.post('/login', login);    
router.post('/forgot-password/send-otp', sendForgotOtp);
router.post('/forgot-password/verify-otp', verifyForgotOtp);
router.post('/forgot-password/reset', resetForgotPassword);
// 👤 User Profile
router.get('/profile/:userId', getProfile);              // Get user profile
router.put('/profile/:userId', updateProfile);           // Update user profile
router.delete('/profile/:userId', deleteProfile);

// ➕ Add address
router.post('/address/:userId', addAddress);

// ✏️ Update address
router.put('/address/:userId', updateAddress);

// 🔍 Get address
router.get('/address/:userId', getAddress);  
router.delete('/address/:userId', deleteAddress);



// POST location (only once)
router.post('/location/:userId', postLocation);

// PUT location (update)
router.put('/location/:userId', updateLocation);

// GET location
router.get('/location/:userId', getLocation);


// 🎁 Referral Info
router.get('/referral/:userId', getReferralByUserId);    // Get referralCode & coins

module.exports = router;
