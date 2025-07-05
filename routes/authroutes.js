const express = require('express');
const router = express.Router();
const {
  register,
  verifyOtp,
  setPassword,
  login,
  getProfile,
  updateProfile,
  addOrUpdateAddress,
  getAddressByUserId,
  getReferralByUserId
} = require('../controllers/userController');




router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/set-password', setPassword);
router.post('/login', login);
router.get('/profile/:userId', getProfile);
router.put('/profile/:userId', updateProfile);
// Update or Add address for a user
router.put('/address/:userId', addOrUpdateAddress);

// Get address by user ID
router.get('/address/:userId', getAddressByUserId);

//referalcode
router.get('/referral/:userId', getReferralByUserId);




module.exports = router;
