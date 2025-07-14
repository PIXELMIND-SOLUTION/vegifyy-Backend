const mongoose = require('mongoose');

const authSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  otp: { type: String },
  isVerified: { type: Boolean, default: false },
  password: { type: String },
  referralCode: { type: String, unique: true },
  referredBy: { type: String, default: null },
  coins: { type: Number, default: 0 },
  address: {
    addressLine1: { type: String },
    addressLine2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String }
  },
  latitude: { type: Number },
  longitude: { type: Number },
  myWishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }
  ]
}, {
  timestamps: true // ✅ CORRECT placement
});

module.exports = mongoose.model('User', authSchema);
