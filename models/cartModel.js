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
        type: mongoose.Schema.Types.ObjectId, // ID of the recommended product inside RestaurantProduct.recommended[]
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      // Store snapshot data so we don’t have to populate every time
      name: { type: String },
      basePrice: { type: Number, default: 0 },
      variationType: { type: String, enum: ["Full", "Half", null], default: null },
      variationPrice: { type: Number, default: 0 },
      platesName: { type: String },
      platePrice: { type: Number, default: 0 },
      totalPlatesPrice: { type: Number, default: 0 },
      image: { type: String }
    },
  ],

  subTotal: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 20 },
  finalAmount: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now }
});



module.exports = mongoose.model("Cart", cartSchema);
