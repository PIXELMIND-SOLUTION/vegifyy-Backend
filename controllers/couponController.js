// const { Coupon, CouponUsage } = require("../models/couponModel");
// const { generateCouponToken } = require("../utils/tokenHelper");
// const jwt = require("jsonwebtoken");

// /* -------------------- Helper: Get User ID from Token -------------------- */
// const getUserIdFromToken = (req) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) throw new Error("Token missing");
//   const decoded = jwt.verify(token, process.env.JWT_SECRET);
//   return decoded.id;
// };

// /* -------------------- Apply Coupon Controller -------------------- */
// exports.applyCoupon = async (req, res) => {
//   try {
//     const userId = getUserIdFromToken(req);
//     const { code, orderValue } = req.body;

//     // Find coupon
//     const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
//     if (!coupon) {
//       return res.status(404).json({ success: false, message: "Coupon not found or inactive" });
//     }

//     // Check if coupon is within validity dates
//     const now = new Date();
//     if (now < coupon.startDate || now > coupon.endDate) {
//       return res.status(400).json({ success: false, message: "Coupon is not valid at this time" });
//     }

//     // Check minimum order value
//     if (orderValue < coupon.minOrderValue) {
//       return res.status(400).json({
//         success: false,
//         message: `Minimum order value should be ₹${coupon.minOrderValue}`
//       });
//     }

//     // Check if user already used this coupon
//     const alreadyUsed = await CouponUsage.findOne({ couponId: coupon._id, userId });
//     if (alreadyUsed) {
//       return res.status(400).json({ success: false, message: "You have already used this coupon" });
//     }

//     // Check usage limit
//     if (coupon.usedCount >= coupon.usageLimit) {
//       return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
//     }

//     // Calculate discount
//     let discountAmount = 0;
//     if (coupon.discountType === "percentage") {
//       discountAmount = (orderValue * coupon.discountValue) / 100;
//       if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
//         discountAmount = coupon.maxDiscountAmount;
//       }
//     } else if (coupon.discountType === "flat") {
//       discountAmount = coupon.discountValue;
//     }

//     // Save coupon usage for this user
//     await CouponUsage.create({ couponId: coupon._id, userId });

//     // Update coupon usage count
//     coupon.usedCount += 1;
//     await coupon.save();

//     // Generate coupon token with expiry = coupon.endDate
//     const couponToken = generateCouponToken({
//       couponId: coupon._id,
//       code: coupon.code,
//       discountAmount,
//       endDate: coupon.endDate
//     });

//     res.status(200).json({
//       success: true,
//       message: "Coupon applied successfully",
//       discountAmount,
//       finalAmount: orderValue - discountAmount,
//       couponToken
//     });

//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
