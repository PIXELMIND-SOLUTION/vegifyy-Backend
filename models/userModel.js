const { latitudeKeys, longitudeKeys } = require('geolib');
const mongoose = require('mongoose');
const { DOUBLE } = require('sequelize');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  otp: { type: String },
  isVerified: { type: Boolean, default: false },
  password: { type: String },
  image:{type:String},


address: [{
  addressLine: { type: String, required: true },
  city: String,
  state: String,
  pinCode: String,
  country: String,
  phone: String,
  houseNumber: String,
  apartment: String,
  directions: String,
  street: String,
  latitud: Number,
  longitud: Number,
}],

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

}, { timestamps: true });

// ✅ Named Exports

// Create 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);

