const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const { generateReferralCode } = require('../utils/referral'); // if separated
const { generateTempToken, verifyTempToken } = require('../utils/jws');


// ✅ TEMP GLOBAL TOKEN (holds latest registration)
let latestToken = null;


// ✅ REGISTER CONTROLLER
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, referralCode } = req.body;

    // 🔒 Check required
    if (!firstName || !lastName || !email || !phoneNumber || !referralCode) {
      return res.status(400).json({ message: 'All fields including referralCode are required ❌' });
    }

    // ❌ Check existing
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or phone already exists ❌' });
    }

    // ✅ Generate
    const generatedReferralCode = generateReferralCode();
    const otp = '1234';

    // 🎯 Token payload
    const payload = {
      firstName,
      lastName,
      email,
      phoneNumber,
      referralCode: generatedReferralCode,
      referredBy: referralCode,
      otp,
      createdAt: new Date().toISOString()
    };

    // 🔐 Generate token for 1 min
    latestToken = generateTempToken(payload);

    res.status(200).json({
      message: 'OTP sent successfully 🔐',
      otp,
      token: latestToken,
      referralCode: generatedReferralCode
    });

  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ error: 'Something went wrong during registration ❌' });
  }
};

// ✅ VERIFY OTP CONTROLLER
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required ❌' });
    }

    if (!latestToken) {
      return res.status(401).json({ message: 'OTP expired or not found. Please register again ❌' });
    }

    const decoded = verifyTempToken(latestToken);

    if (otp !== decoded.otp) {
      return res.status(400).json({ message: 'Invalid OTP ❌' });
    }

    // ✅ Save to DB
    const newUser = new User({
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      email: decoded.email,
      phoneNumber: decoded.phoneNumber,
      referralCode: decoded.referralCode,
      referredBy: decoded.referredBy,
      otp: decoded.otp
    });

    await newUser.save();

    // ✅ Invalidate token after use
    latestToken = null;

    res.status(201).json({
      message: '✅ OTP verified successfully. User registered!'
    });

  } catch (err) {
    console.error('OTP Verification Error:', err);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '⏰ OTP expired. Please register again.' });
    }

    res.status(500).json({ error: 'Something went wrong during OTP verification ❌' });
  }
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
