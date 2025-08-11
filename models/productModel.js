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
  productName:{
    type:String
  },
  productPrice:{
    type:String
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
      
      price: { type: Number } // Final price, computed during controller logic
    },
    plates: {
      name: { type: String },
      item: { type: Number },
      platePrice: { type: Number },
      totalPlatesPrice: { type: Number }
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
restaurantProduct: {
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantProduct',
    required: true
  },
  quantity: {
    type: Number,
   
  },
  
}
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);