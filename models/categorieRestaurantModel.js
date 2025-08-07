const mongoose = require("mongoose");

const categorieRestaurantProductSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant", // Reference to the Restaurant model
    required: true,
  },
  image: { type: String }, // Cloudinary image URL
  content: { type: String },

  categorie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category", // Reference to the Category model
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("CategorieRestaurantProduct", categorieRestaurantProductSchema);
