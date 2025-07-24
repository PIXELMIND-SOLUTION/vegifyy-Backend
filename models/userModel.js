const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: { 
    type: String, 
    required: [true, 'Last name is required'],
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phoneNumber: { 
    type: String, 
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit phone number!`
    }
  },
  otp: { 
    type: String,
    select: false // Don't return OTP in queries
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    select: false
  },
  referralCode: { 
    type: String, 
    unique: true,
    uppercase: true,
    trim: true
  },
  referredBy: { 
    type: String, 
    default: null,
    trim: true
  },
  coins: { 
    type: Number, 
    default: 0,
    min: 0
  },
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  address: {
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true }
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

// Virtual for confirm password
userSchema.virtual('confirmPassword')
  .get(function() { return this._confirmPassword; })
  .set(function(value) { this._confirmPassword = value; });

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