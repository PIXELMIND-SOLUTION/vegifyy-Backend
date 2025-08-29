const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
      code: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true },
  maxDiscountAmount: { type: Number },
  minCartAmount: { type: Number },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: false } // <-- optional now
}, { timestamps: true });


module.exports = mongoose.model('Coupon', couponSchema);
