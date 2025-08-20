const express = require("express");
const router = express.Router();
const DeliveryBoy  = require("../controllers/deliveryBoyController");
const multer = require("multer");

// Setup multer for file uploads
const storage = multer.diskStorage({});
const upload = multer({ storage });

router.post("/register", upload.fields([
  { name: "aadharCard", maxCount: 1 },
  { name: "drivingLicense", maxCount: 1 }
]),DeliveryBoy. registerDeliveryBoy);

router.post("/verify-otp", DeliveryBoy.verifyOTP);

router.post("/Login", DeliveryBoy.requestLoginOTP); 
router.post("/LoginVerify-otp", DeliveryBoy.verifyLoginOTP);  
// Update delivery boy profile (email and/or image)
router.put(
  "/profile/:userId",
  upload.fields([{ name: "image", maxCount: 1 }]),
  DeliveryBoy.updateProfile
);

// Get full delivery boy profile
router.get("/profile/:userId", DeliveryBoy.getProfile);
router.put("/location/:deliveryBoyId", DeliveryBoy.updateLocation);


// Assign order to nearby delivery boys (within 8 km)
router.post("/assign-order", DeliveryBoy.assignOrder);

// Delivery boy accepts order (cancels other assignments)
router.post("/accept-order", DeliveryBoy.acceptOrder);

// Assign delivery boy and track location (real-time)
router.put("/track-delivery", DeliveryBoy.assignDeliveryAndTrack);

// Update delivery status (Picked or Delivered)
router.post("/update-status", DeliveryBoy.updateDeliveryStatus);

// Get daily stats (orders, cancelled, completed)
router.get("/daily-stats", DeliveryBoy.getDailyStats);


module.exports = router;
