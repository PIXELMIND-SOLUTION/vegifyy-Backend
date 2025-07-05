const mongoose = require('mongoose');

//
//Product Schema
//
const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  category:    { type: String },
  stock:       { type: Number, default: 0 },
  description: { type: String }
});

const Product = mongoose.model('Product', productSchema);

//
//Order Schema
//
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Auth' // Make sure 'Auth' model is defined somewhere
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: { type: Number, required: true },
      price:    { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'ongoing', 'cancelled', 'shipped', 'delivered'],
    default: 'pending'
  },
  orderDate: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

//
// Export both models
//
module.exports = {
  Product,
  Order
};
