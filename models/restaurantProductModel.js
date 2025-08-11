const mongoose = require("mongoose");
const { Category } = require("./foodSystemModel");

const RestaurantProductSchema = new mongoose.Schema({
  restaurantName: { type: String },
  locationName: { type: String },
  type: { type: [String] },
  rating: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },

  // Recommended products
  recommended: [{
    name: { type: String },
    price: { type: Number },
    rating: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    content: { type: String },
    image: { type: String },
    vendorHalfPercentage: { type: Number },
    vendor_Platecost: { type: Number },

    // Optional Addons
    addons: {
      productName: { type: String },
      variation: {
        name: { type: String },
        type: {
          type: String,
          enum: ["Full", "Half"],
        },
        price: { type: Number }
      },
      plates: {
        name: { type: String },
        item: { type: Number },
        platePrice: { type: Number },
        totalPlatesPrice: { type: Number }
      }
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
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
