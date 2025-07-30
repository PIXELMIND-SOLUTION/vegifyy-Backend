const mongoose = require('mongoose');

const recommendedSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  image: {
    public_id: String,
    url: String
  },
  content: { type: String }
});

const restaurantProductSchema = new mongoose.Schema({
  restaurantName: { type: String, required: true },
  locationName: { type: String, required: true },
    timeAndKm: {
    time: { type: String },
    distance: { type: String }
  },
  type: { type: [String], required: true },
  rating: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  recommended: [recommendedSchema],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
restaurantId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Restaurant",
  required: true
},
}, { timestamps: true
 }
);

module.exports = mongoose.model('RestaurantProduct', restaurantProductSchema);
