const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  myWishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ location: '2dsphere' });

const bannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  }
}, { timestamps: true });

// ✅ Named Exports
const User = mongoose.model('User', userSchema);
const Banner = mongoose.model('Banner', bannerSchema);

module.exports = { User, Banner };
