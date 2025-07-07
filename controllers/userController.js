const Auth = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Temporary in-memory OTP storage
const tempUsers = {};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'yourgmail@gmail.com',
    pass: 'yourapppassword'
  }
});

// Register user with OTP
const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Request OTP (no DB save yet)
const register = async (req, res) => {
  const { firstName, lastName, email, phoneNumber, referralCodeUsed } = req.body;

  if (!firstName || !lastName || !email || !phoneNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existing = await Auth.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    tempUsers[email] = {
      otp,
      userData: { firstName, lastName, email, phoneNumber, referralCodeUsed }
    };

    await transporter.sendMail({
      from: 'yourgmail@gmail.com',
      to: email,
      subject: 'OTP Verification',
      text: `Your OTP is ${otp}`
    });

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (err) {
    res.status(500).json({ message: 'OTP request failed', error: err.message });
  }
};


// Verify OTP and register user
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const temp = tempUsers[email];

  if (!temp) return res.status(400).json({ message: 'No OTP request found for this email' });
  if (temp.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

  try {
    const { firstName, lastName, phoneNumber, referralCodeUsed } = temp.userData;
    const referralCode = generateReferralCode();
    let referredBy = null;
    let coins = 0;

    if (referralCodeUsed) {
      const referrer = await Auth.findOne({ referralCode: referralCodeUsed });
      if (referrer) {
        referrer.coins += 100;
        await referrer.save();
        referredBy = referralCodeUsed;
        coins = 100;
      }
    }

    const newUser = await Auth.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      isVerified: true,
      referralCode,
      referredBy,
      coins
    });

    delete tempUsers[email];

    res.status(201).json({ message: 'User registered successfully', userId: newUser._id, referralCode });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// Set Password after OTP
const setPassword = async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) return res.status(400).json({ message: 'All fields required' });

  const user = await Auth.findById(userId);
  if (!user || !user.isVerified) return res.status(400).json({ message: 'User not verified' });

  const hashed = await bcrypt.hash(password, 10);
  user.password = hashed;
  await user.save();

  res.status(200).json({ message: 'Password set successfully' });
};

// Login
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await Auth.findOne({ email });
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
};
// Get profile by ID with fullName
const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;    

    const user = await Auth.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const fullName = `${user.firstName} ${user.lastName}`;
    res.status(200).json({
      fullName,
      email: user.email,
      phoneNumber: user.phoneNumber
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get profile', error: err.message });
  }
};


// Update profile by ID and return updated fullName
const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, phoneNumber } = req.body;

    const updatedUser = await Auth.findByIdAndUpdate(
      userId,
      { firstName, lastName, email, phoneNumber },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    const fullName = `${updatedUser.firstName} ${updatedUser.lastName}`;

    res.status(200).json({
      message: 'Profile updated successfully',
      fullName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};
// PUT: Add or Update Address
const addOrUpdateAddress = async (req, res) => {
  const { userId } = req.params;
  const { addressLine1, addressLine2, city, state, postalCode, country } = req.body;

  try {
    const user = await Auth.findByIdAndUpdate(
      userId,
      {
        address: {
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Address updated successfully',
      address: user.address
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating address', error: err.message });
  }
};

// GET: Get Address by user ID
const getAddressByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await Auth.findById(userId).select('address');
    if (!user || !user.address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.status(200).json({ address: user.address });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching address', error: err.message });
  }
};


// GET: Get referral code and coins by user ID
const getReferralByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await Auth.findById(userId).select('referralCode coins');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      message: 'Referral details fetched',
      referralCode: user.referralCode,
      coins: user.coins
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching referral data', error: err.message });
  }
};




// 👇 Final Export
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
