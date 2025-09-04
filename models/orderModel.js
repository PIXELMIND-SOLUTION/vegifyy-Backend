const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true
    },
    restaurantLocation: {
      type: String, // populated from Restaurant.locationName
      required: false
    },
    deliveryAddress: {
      type: mongoose.Schema.Types.Mixed, // whole address object (flexible schema)
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Online"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending"
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Preparing", "On the Way", "Processing", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending"
    },
    totalItems: {
      type: Number,
      default: 0
    },
    subTotal: {
      type: Number,
      default: 0
    },
    deliveryCharge: {
      type: Number,
      default: 20
    },
      couponDiscount: { type: Number, default: 0 },
    totalPayable: {
      type: Number,
      default: 0
    }, 
    distanceKm: { type: Number, default: 0 },
     products: [
      {
        restaurantProductId: { type: mongoose.Schema.Types.ObjectId, ref: "RestaurantProduct" },
        recommendedId: { type: mongoose.Schema.Types.ObjectId },
        name: { type: String },
        quantity: { type: Number },
        basePrice: { type: Number },
        images: [{ type: String }],                // <-- include images here
        addons: { type: Object },                  // <-- include addons
        vendorHalfPercentage: { type: Number },    // <-- optional if needed
        vendor_Platecost: { type: Number },        // <-- optional if needed
        calculatedPrice: { type: Object }          // <-- optional if needed
      }
    ]
   
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order", orderSchema);
