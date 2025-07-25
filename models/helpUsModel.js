const mongoose = require('mongoose');

const helpUsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  issueType: {
    type: String,
    enum: ['Payment', 'Delivery', 'Product', 'Refund', 'Other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('HelpUs', helpUsSchema);
