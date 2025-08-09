const mongoose = require("mongoose");
const { Category } = require("./foodSystemModel");

const RestaurantProductSchema = new mongoose.Schema({
  restaurantName: { type: String },
  locationName: { type: String },
  type: { type: [String] },
  rating: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
 
  recommended: [{
    name: { type: String },
    price: { type: Number },
    rating: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    content: { type: String },
    image: {
    type: String
  },  
  vendorHalfPercentage: { type: Number },
  vendor_Platecost: { type: Number },
  addons: {
    productName: { type: String },
    variation: {
      name: { type: String },
      type: {
        type: String,
        enum: ["Full", "Half"],
      },
      
      price: { type: Number } // Final price, computed during controller logic
    },
    plates: {
      name: { type: String },
      item: { type: Number },
      platePrice: { type: Number },
      totalPlatesPrice: { type: Number }
    },
    addonImage: {
      public_id: { type: String },
      url: { type: String }
    }
  },
  category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Reference to the Category model
    },
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant"
  },
  timeAndKm: {
    time: { type: String },
    distance: { type: String }
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model("RestaurantProduct", RestaurantProductSchema);
