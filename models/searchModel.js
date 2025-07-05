// models/searchModel.js
const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  category: { type: String },
  price:    { type: Number }
});

module.exports = mongoose.model('SearchItem', searchSchema);
