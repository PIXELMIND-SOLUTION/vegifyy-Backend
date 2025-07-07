const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const otpGenerator = require('otp-generator');

// Generate 6-character referral code
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ✅ Registration Controller
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or Mobile already exists' });
    }

    const generatedReferralCode = generateReferralCode();
    const otp = '1234'; // ✅ Always fixed OTP

    // Save user
    const newUser = new User({
      firstName,
      lastName,
      email,
      phoneNumber,
      referralCode: generatedReferralCode,
      referredBy: referralCode || null,
      otp: otp  // ✅ Save 1234 to DB
    });

    await newUser.save();

    res.status(201).json({
      message: 'User registered successfully. Please verify OTP.',
      otp: otp,  // ✅ Will always send 1234
      yourReferralCode: generatedReferralCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ OTP Verification Controller
const verifyOtp = async (req, res) => {
  const { otp } = req.body;

  if (otp !== '1234') {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  // Find the latest user waiting for OTP verification
  const user = await User.findOne({ otp: '1234', isVerified: false }).sort({ createdAt: -1 });

  if (!user) {
    return res.status(404).json({ message: 'User not found or already verified' });
  }

  user.isVerified = true;
  await user.save();

  return res.status(200).json({ message: 'OTP verified successfully' });
};


const setPassword = async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  try {
    // Only verified users without a password can set a new password
    const user = await User.findOne({ isVerified: true, password: null }).sort({ createdAt: -1 });

    if (!user) {
      return res.status(400).json({ message: 'User not found or password already set' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password set successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to set password', error: err.message });
  }
};


const login = async (req, res) => {
  const { phoneNumber, password } = req.body;
  if (!phoneNumber || !password) return res.status(400).json({ message: 'All fields required' });

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phoneNumber: user.phoneNumber
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, req.body, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      message: 'Profile updated successfully',
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phoneNumber: user.phoneNumber
    });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

const addOrUpdateAddress = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { address: req.body }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'Address saved successfully', address: user.address });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save address', error: err.message });
  }
};

const getAddressByUserId = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('address');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ address: user.address });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get address', error: err.message });
  }
};

const getReferralByUserId = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('referralCode coins');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ referralCode: user.referralCode, coins: user.coins });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get referral info', error: err.message });
  }
};

// ⬇️ Export all functions here
module.exports = {
  register,
  verifyOtp,
  setPassword,
  login,
  getProfile,
  updateProfile,
  addOrUpdateAddress,
  getAddressByUserId,
  getReferralByUserId
};
