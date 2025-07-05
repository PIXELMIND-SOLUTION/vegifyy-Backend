const mongoose = require('mongoose');

const aboutUsSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AboutUs', aboutUsSchema);
