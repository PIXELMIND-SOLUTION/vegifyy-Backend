const mongoose = require("mongoose");

// Delivery Boy Schema
const deliveryBoySchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },
  vehicleType: { type: String, required: true },
  aadharCard: { type: String, required: true }, // Cloudinary URL
  drivingLicense: { type: String, required: true }, // Cloudinary URL
  email: {
    type: String,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  image: { type: String },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

deliveryBoySchema.index({ location: "2dsphere" }); // For geospatial queries

// Delivery Assignment Schema
const deliveryAssignmentSchema = new mongoose.Schema({
 orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  deliveryBoyId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryBoy", required: true },
  pickupDistance: { type: Number, required: true },
  dropDistance: { type: Number, required: true },

  status: { type: String, enum: ["Pending", "Accepted", "Picked", "Delivered"], default: "Pending" },
  acceptedAt: Date,
  cancelledAt: Date,
  deliveredAt: Date,

  orderDetails: { type: Object }, 
  chat: [{ 
    sender: { type: String, enum: ["User", "DeliveryBoy"], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  chatActive: { type: Boolean, default: false }      // Will store order info
  }, { timestamps: true });
// Export both models
module.exports = {
  DeliveryBoy: mongoose.model("DeliveryBoy", deliveryBoySchema),
  DeliveryAssignment: mongoose.model("DeliveryAssignment", deliveryAssignmentSchema)
};
