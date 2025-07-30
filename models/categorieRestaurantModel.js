const mongoose = require("mongoose");

const categorieRestaurantProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String }, // Cloudinary image URL
  rating: { type: Number, default: 0 },
  content: { type: String },
  locationName: { type: [String] }, // Array of location strings
  categorie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category", // Reference to the Categorie model
  },
}, { timestamps: true });

module.exports = mongoose.model("CategorieRestaurantProduct", categorieRestaurantProductSchema);
