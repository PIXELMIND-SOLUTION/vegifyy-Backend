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
      variation: {             // Single object
        name: { type: String, default: "" },
        type: { type: [String], default: [] } // e.g., ["Half"] or ["Full"]
      },
      plates: {
        _id: false,
        name: { type: String, default: "" }
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantProduct',
    required: true
  },
 restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  restaurantName: {
    type: String
  },
  restaurantLocation: {
    type: String
  }

},  {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});



module.exports = mongoose.model('Product', productSchema);