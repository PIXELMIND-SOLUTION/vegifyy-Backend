// const mongoose = require("mongoose");

// /* -------------------- Coupon Schema -------------------- */
// const couponSchema = new mongoose.Schema({
//   code: {
//     type: String,
//     required: true,
//     unique: true,
//     trim: true,
//     uppercase: true,
//   },
//   description: String,
//   discountType: {
//     type: String,
//     enum: ["percentage", "flat"],
//     required: true,
//   },
//   discountValue: {
//     type: Number,
//     required: true,
//   },
//   maxDiscountAmount: Number, // only for percentage
//   minOrderValue: {
//     type: Number,
//     default: 0,
//   },
//   startDate: {
//     type: Date,
//     required: true,
//   },
//   endDate: {
//     type: Date,
//     required: true,
//   },
//   usageLimit: {
//     type: Number,
//     default: 1,
//   },
//   usedCount: {
//     type: Number,
//     default: 0,
//   },
//   isActive: {
//     type: Boolean,
//     default: true,
//   }
// }, { timestamps: true });

// /* -------------------- Coupon Usage Schema -------------------- */
// const couponUsageSchema = new mongoose.Schema({
//   couponId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Coupon",
//     required: true,
//   },
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   usedAt: {
//     type: Date,
//     default: Date.now,
//   }
// }, { timestamps: true });

// // Ensures one user can only use a coupon once
// couponUsageSchema.index({ couponId: 1, userId: 1 }, { unique: true });

// /* -------------------- Models Export -------------------- */
// const Coupon = mongoose.model("Coupon", couponSchema);
// const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);

// module.exports = { Coupon, CouponUsage };
