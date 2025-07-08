const express = require('express');
const router = express.Router();

const {
  register,
  verifyOtp,
  setPassword,
  login,
  getProfile,
  updateProfile,
  deleteProfile,
  addAddress,
  getAddress,
  updateAddress,
  deleteAddress, 
  getReferralByUserId,
  
} = require('../controllers/userController');

// 🔐 Authentication Flow
router.post('/register', register);              // Step 1: Register with referralCode (optional)
router.post('/verify-otp', verifyOtp);           // Step 2: OTP verification (fixed OTP 1234)
router.post('/set-password', setPassword);       // Step 3: Set password after OTP
router.post('/login', login);                    // Step 4: Login with phoneNumber + password

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


// 🎁 Referral Info
router.get('/referral/:userId', getReferralByUserId);    // Get referralCode & coins

module.exports = router;
