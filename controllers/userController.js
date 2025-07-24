// ✅ User Controller with Complete Flow
const mongoose = require('mongoose');
const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateReferralCode } = require('../utils/refeeral');
const { generateTempToken, verifyTempToken } = require('../utils/jws');

let latestToken = null;
let tempForgotToken = null;
let verifiedForgotPhone = null;



const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, referralCode } = req.body;

    // Validate required fields (referralCode is optional)
    if (!firstName || !lastName || !email || !phoneNumber) {
      return res.status(400).json({
        message: 'firstName, lastName, email, and phoneNumber are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate new referral code for the user
    const generatedReferralCode = generateReferralCode();

    // Hardcoded OTP for now
    const otp = '1234';

    // Create payload for temp token
    const payload = {
      firstName,
      lastName,
      email,
      phoneNumber,
      referralCode: generatedReferralCode,       // this user's referral code
      referredBy: referralCode || null,          // who referred this user, if any
      otp,
      createdAt: new Date().toISOString()
    };

    // Generate temporary token
    latestToken = generateTempToken(payload);

    // Success response
    res.status(200).json({
      message: 'OTP sent successfully',
      otp,
      token: latestToken,
      referralCode: generatedReferralCode
    });
  } catch (err) {
    res.status(500).json({
      message: 'Registration failed',
      error: err.message
    });
  }
};


const verifyOtp = async (req, res) => {
  try {
    const { otp, token } = req.body;
    if (!otp || !token) return res.status(400).json({ message: 'OTP and token are required' });

    const decoded = verifyTempToken(token);
    if (otp !== decoded.otp) return res.status(400).json({ message: 'Invalid OTP' });

    const user = await User.create({
      _id: new mongoose.Types.ObjectId(),
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      email: decoded.email,
      phoneNumber: decoded.phoneNumber,
      referralCode: decoded.referralCode,
      referredBy: decoded.referredBy,
      isVerified: true
    });

    res.status(200).json({
      message: 'OTP verified ✅',
      userId: user._id
    });
  } catch (err) {
    res.status(400).json({ message: 'OTP verification failed ❌', error: err.message });
  }
};


const setPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    // Validate input
    if (!userId || !password) {
      return res.status(400).json({ message: 'UserId and password are required' });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.password) {
      return res.status(400).json({ message: 'Password already set' });
    }

    // Hash and set password
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({ message: 'Password set successfully ✅' });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to set password',
      error: err.message
    });
  }
};

const login = async (req, res) => {
  const { phoneNumber, password } = req.body;
  if (!phoneNumber || !password)
    return res.status(400).json({ message: 'All fields required' });

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    res.status(200).json({
      message: 'Login successful ✅',
      user: {
        userId: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};
const sendForgotOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: "User not found" });
    const otp = '1234';
    tempForgotToken = generateTempToken({ phoneNumber, otp });
    return res.status(200).json({ message: "OTP sent ✅", otp });
  } catch (err) {
    return res.status(500).json({ message: "OTP send failed ❌", error: err.message });
  }
};

const verifyForgotOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp || otp !== '1234' || !tempForgotToken) return res.status(400).json({ message: "Invalid OTP" });
    const decoded = verifyTempToken(tempForgotToken);
    verifiedForgotPhone = decoded.phoneNumber;
    tempForgotToken = null;
    return res.status(200).json({ message: "OTP verified ✅" });
  } catch (err) {
    return res.status(400).json({ message: "OTP verification failed ❌", error: err.message });
  }
};

const resetForgotPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    if (!verifiedForgotPhone) return res.status(400).json({ message: "OTP verification required" });
    if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
    const user = await User.findOne({ phoneNumber: verifiedForgotPhone });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    verifiedForgotPhone = null;
    return res.status(200).json({ message: "Password reset successful ✅" });
  } catch (err) {
    return res.status(500).json({ message: "Password reset failed ❌", error: err.message });
  }
};


const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      message: 'Profile fetched ✅',
      user: {
        userId: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phoneNumber: user.phoneNumber,
        referralCode: user.referralCode,
        coins: user.coins || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Profile fetch failed', error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updatedUser = await User.findByIdAndUpdate(userId, req.body, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      message: 'Profile updated ✅',
      user: {
        userId: updatedUser._id,
        fullName: `${updatedUser.firstName} ${updatedUser.lastName}`,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        referralCode: updatedUser.referralCode,
        coins: updatedUser.coins || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Profile update failed', error: err.message });
  }
};

const deleteProfile = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.userId);
    if (!deletedUser) return res.status(404).json({ message: 'User not found ❌' });

    res.status(200).json({ message: 'Profile deleted successfully ✅' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete profile ❌', error: err.message });
  }
};


const addAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const address = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found ❌' });

    user.address = address;
    await user.save();

    res.status(200).json({
      message: 'Address added successfully ✅',
      address: user.address
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add address ❌', error: err.message });
  }
};

const getAddress = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('address');
    if (!user) return res.status(404).json({ message: 'User not found ❌' });

    res.status(200).json({
      message: 'Address fetched successfully ✅',
      address: user.address
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch address ❌', error: err.message });
  }
};



const updateAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const newAddress = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { address: newAddress } },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found ❌' });

    res.status(200).json({
      message: 'Address updated successfully ✅',
      address: user.address
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update address ❌', error: err.message });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found ❌' });

    user.address = {}; // clear the address object
    await user.save();

    res.status(200).json({ message: 'Address deleted successfully ✅' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete address ❌', error: err.message });
  }
};

// ✅ POST Location (Only if location not already present)
const postLocation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false,
        message: "Both latitude and longitude are required" 
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        success: false,
        message: "Coordinates must be valid numbers" 
      });
    }

    // Update user location
    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type: 'Point',
          coordinates: [lng, lat] // [longitude, latitude]
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      location: user.location
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: error.message
    });
  }
};

// ✅ PUT Location (Update existing)
const updateLocation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { latitude, longitude },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: 'User not found ❌' });

    res.status(200).json({
      message: 'Location updated successfully ✅',
      location: {
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update location ❌', error: err.message });
  }
};

// ✅ GET Location
const getLocation = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('latitude longitude');
    if (!user) return res.status(404).json({ message: 'User not found ❌' });

    res.status(200).json({
      message: 'Location fetched ✅',
      location: {
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch location ❌', error: err.message });
  }
};


const getReferralByUserId = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('referralCode coins');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ referralCode: user.referralCode, coins: user.coins });
  } catch (err) {
    res.status(500).json({ message: 'Get referral failed', error: err.message });
  }
};


module.exports = {
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
  getReferralByUserId
};
