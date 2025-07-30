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
  image:{
    type:String
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
  variation: {
    type: String,
    enum: {
      values: ['Half', 'Full'],
      message: 'Variation can only be Half or Full'
    },
    
    default: 'Full'
  },
  userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
},
  addOns: [
    {
      name: {
        type: String,
        required: [true, 'Add-on name is required']
      },
      price: {
        type: Number,
        required: [true, 'Add-on price is required'],
        min: [0, 'Price of add-on must be non-negative']
      }
    }
  ],
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
  required: [true, 'Delivery time is required'] // remove enum
},
  reviews: [reviewSchema],

  // Restaurant Reference
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);