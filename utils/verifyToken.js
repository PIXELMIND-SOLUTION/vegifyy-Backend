// const jwt = require("jsonwebtoken");

// function generateCouponToken(couponData) {
//   // Calculate token expiry in seconds from now until coupon end date
//   const expiresInSeconds = Math.floor((new Date(couponData.endDate) - new Date()) / 1000);

//   if (expiresInSeconds <= 0) {
//     throw new Error("Coupon has already expired");
//   }

//   return jwt.sign(
//     couponData, // payload (coupon details)
//     process.env.JWT_SECRET,
//     { expiresIn: expiresInSeconds } // dynamic expiry based on coupon end date
//   );
// }

// function verifyCouponToken(token) {
//   return jwt.verify(token, process.env.JWT_SECRET);
// }

// module.exports = { generateCouponToken, verifyCouponToken };
