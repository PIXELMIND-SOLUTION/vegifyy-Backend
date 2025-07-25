const mongoose = require('mongoose');

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
  category: {
    type: String,
    default: 'General'
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock must be a non-negative number']
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
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

  // ✅ Restaurant Reference
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
