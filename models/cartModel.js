const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [
    {
      restaurantProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RestaurantProduct",
        required: true,
      },
      recommendedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      name: { type: String },
      basePrice: { type: Number, default: 0 },

      // Snapshot addons object copied from RestaurantProduct.recommended.addons
      addons: {
        productName: { type: String },
        variation: {
          name: { type: String },
          type: { type: String, enum: ["Full", "Half"], default: null },
          price: { type: Number, default: 0 },
        },
        plates: {
          name: { type: String },
          item: { type: Number },
          platePrice: { type: Number },
          totalPlatesPrice: { type: Number, default: 0 },
        },
      },

      image: { type: String },
    },
  ],

  subTotal: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 20 },
  finalAmount: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cart", cartSchema);
