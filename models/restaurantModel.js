const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
  restaurantName: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
  },
  location: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
  },
  image: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Restaurant", restaurantSchema);
