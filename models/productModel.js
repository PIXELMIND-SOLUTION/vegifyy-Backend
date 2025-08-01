const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  locationname: {
    type: String,
  },
  content: {
    type: String,
  },
  image: {
    type: String
  },
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be a positive number']
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: [String],
    default: ''
  },
  vendorHalfPercentage: { type: Number },
  vendor_Platecost: { type: Number },
  addons: {
    productName: { type: String },
    variation: {
      name: { type: String },
      type: {
        type: String,
        enum: ["Full", "Half"],
      },
      vendorPercentage: { type: Number }, // Only used if type is 'Half'
      price: { type: Number } // Final price, computed during controller logic
    },
    plates: {
      name: { type: String },
      item: { type: Number },
      platePrice: { type: Number },
      totalPlatesPrice: { type: Number }
    },
    addonImage: {
      public_id: { type: String },
      url: { type: String }
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  locationname: {
    type: [String],

  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5']
  },
  viewcount: {
    type: Number,
    default: 0
  },
  contentname: {
    type: String,
  },
  deliverytime: {
    type: String,
  },
  reviews: [reviewSchema],

  // Restaurant Reference
  RestaurantProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantProduct',
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);