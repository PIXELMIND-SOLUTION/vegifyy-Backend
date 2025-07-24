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
      default: [0, 0],
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && 
                 v[1] >= -90 && v[1] <= 90;
        },
        message: props => `${props.value} is not valid [longitude, latitude] coordinates!`
      }
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

// ✅ Fix: Use authSchema not userSchema
userSchema.virtual('confirmPassword')
  .get(function () {
    return this._confirmPassword;
  })
  .set(function (value) {
    this._confirmPassword = value;
  });

// Validate password match
userSchema.pre('save', function(next) {
  if (this.isModified('password') && this.password !== this.confirmPassword) {
    throw new Error('Password and confirm password do not match');
  }
  next();
});

// Geospatial index
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);