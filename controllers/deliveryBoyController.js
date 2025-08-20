const { DeliveryBoy, DeliveryAssignment } = require("../models/deliveryBoyModel");
const Restaurant = require("../models/restaurantModel");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const cloudinary = require("../config/cloudinary");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");


// Haversine formula
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Temporary OTP
const OTP = "1234";

// Step 1: Register Delivery Boy (store in token)
exports.registerDeliveryBoy = async (req, res) => {
  try {
    const { fullName, mobileNumber, vehicleType, email } = req.body;
    const aadharCard = req.files.aadharCard;
    const drivingLicense = req.files.drivingLicense;

    if (!fullName || !mobileNumber || !vehicleType || !aadharCard || !drivingLicense) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // Check if mobile number already exists
    const existingUser = await DeliveryBoy.findOne({ mobileNumber });
    if (existingUser) {
      return res.status(400).json({ message: "Mobile Number already registered." });
    }

    // Upload files to Cloudinary
    const aadharUpload = await cloudinary.uploader.upload(aadharCard[0].path);
    const licenseUpload = await cloudinary.uploader.upload(drivingLicense[0].path);

    // Create token with all data (email optional)
    const tokenData = {
      fullName,
      mobileNumber,
      vehicleType,
      aadharCard: aadharUpload.secure_url,
      drivingLicense: licenseUpload.secure_url
    };
    if (email) tokenData.email = email;

    const token = jwt.sign(tokenData, "temporarySecret", { expiresIn: "5m" }); // 5 min validity

    res.status(200).json({ message: "OTP sent (always 1234)", token });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Step 2: Verify OTP and save in DB
exports.verifyOTP = async (req, res) => {
  try {
    const { token, otp } = req.body;
    if (!token || !otp) {
      return res.status(400).json({ message: "Token and OTP are required." });
    }
    if (otp !== OTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Decode token
    const decoded = jwt.verify(token, "temporarySecret");

    // Save in DB
    const newDeliveryBoy = new DeliveryBoy(decoded);
    await newDeliveryBoy.save();

    res.status(200).json({ message: "Delivery Boy Registered Successfully" });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Step 1: Request OTP for login
exports.requestLoginOTP = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile Number is required" });
    }

    // Check if delivery boy exists
    const deliveryBoy = await DeliveryBoy.findOne({ mobileNumber });
    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery Boy not found. Please register first." });
    }

    // Create temporary token with mobileNumber (valid for 5 mins)
    const token = jwt.sign({ mobileNumber }, "loginSecret", { expiresIn: "5m" });

    res.status(200).json({
      message: "OTP sent (always 1234)",
      token
    });
  } catch (error) {
    console.error("Request Login OTP Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Step 2: Verify OTP and login
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { token, otp } = req.body;

    if (!token || !otp) {
      return res.status(400).json({ message: "Token and OTP are required." });
    }
    if (otp !== OTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Decode token to get mobileNumber
    const decoded = jwt.verify(token, "loginSecret");
    const { mobileNumber } = decoded;

    // Fetch delivery boy from DB
    const deliveryBoy = await DeliveryBoy.findOne({ mobileNumber });
    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery Boy not found." });
    }

    // Create auth token for future authenticated requests (optional)
    const authToken = jwt.sign({ id: deliveryBoy._id }, "authSecret", { expiresIn: "7d" });

    res.status(200).json({
      message: "Login successful",
      deliveryBoy,
      authToken
    });
  } catch (error) {
    console.error("Login OTP Verification Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update email and/or image
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, longitude, latitude } = req.body;
    let imageUrl;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Valid userId is required." });
    }

    // If image is sent, upload to Cloudinary
    if (req.files && req.files.image) {
      const uploadRes = await cloudinary.uploader.upload(req.files.image[0].path);
      imageUrl = uploadRes.secure_url;
    }

    // Prepare update fields dynamically
    const updateFields = {};
    if (email) updateFields.email = email;
    if (imageUrl) updateFields.image = imageUrl;

    // Only update location if both coordinates are provided and valid
    if (longitude !== undefined && latitude !== undefined) {
      const lon = parseFloat(longitude);
      const lat = parseFloat(latitude);

      if (isNaN(lon) || isNaN(lat)) {
        return res.status(400).json({ message: "Longitude and latitude must be valid numbers." });
      }

      updateFields.location = {
        type: "Point",
        coordinates: [lon, lat] // GeoJSON format [longitude, latitude]
      };
    }

    const updatedDeliveryBoy = await DeliveryBoy.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedDeliveryBoy) {
      return res.status(404).json({ message: "Delivery boy not found." });
    }

    res.status(200).json({
      success: true,
      data: updatedDeliveryBoy
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get full profile (all details in one object)
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Valid userId is required." });
    }

    const deliveryBoy = await DeliveryBoy.findById(userId).lean();
    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery boy not found." });
    }

    res.status(200).json({
      success: true,
      data: deliveryBoy  // already flat — no nesting
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update delivery boy location (longitude, latitude)
exports.updateLocation = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const { latitude, longitude } = req.body;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
      return res.status(400).json({ message: "Valid deliveryBoyId is required." });
    }

    // Validate coordinates
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ message: "Latitude and Longitude must be numbers." });
    }

    // Update location using GeoJSON format
    const updatedDeliveryBoy = await DeliveryBoy.findByIdAndUpdate(
      deliveryBoyId,
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [longitude, latitude] // Note order: [lng, lat]
          }
        }
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedDeliveryBoy) {
      return res.status(404).json({ message: "Delivery boy not found." });
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: updatedDeliveryBoy
    });
  } catch (error) {
    console.error("Update Location Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Assign order to nearby delivery boys
exports.assignOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(orderId))
      return res.status(400).json({ success: false, message: "Valid orderId is required." });

    const order = await Order.findById(orderId).populate("restaurantId userId");
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });

    // Check if already assigned to a delivery boy
    const existingAssignment = await DeliveryAssignment.findOne({
      orderId: order._id,
      status: { $in: ["Accepted", "Picked", "Delivered"] } // already taken
    });

    if (existingAssignment) {
      return res.status(200).json({
        success: true,
        message: "Order already assigned to a delivery boy",
        data: existingAssignment
      });
    }

    // Optionally also check for pending assignments to avoid duplicate pushes
    const pendingAssignments = await DeliveryAssignment.find({
      orderId: order._id,
      status: "Pending"
    });

    if (pendingAssignments.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Order is already sent to delivery boys",
        data: pendingAssignments
      });
    }

    // Proceed with assigning to nearby delivery boys
    const restaurantLoc = order.restaurantId.location.coordinates;
    const userLoc = order.userId.location.coordinates;

    const deliveryBoys = await DeliveryBoy.find({ "location.coordinates": { $exists: true } });

    const assignments = [];
    for (const boy of deliveryBoys) {
      if (!boy.location?.coordinates) continue;

      const [boyLon, boyLat] = boy.location.coordinates;
      const pickupDistance = parseFloat(calculateDistanceKm(boyLat, boyLon, restaurantLoc[1], restaurantLoc[0]).toFixed(2));
      const dropDistance = parseFloat(calculateDistanceKm(restaurantLoc[1], restaurantLoc[0], userLoc[1], userLoc[0]).toFixed(2));

      if (pickupDistance <= 8) {
        const assignment = await DeliveryAssignment.create({
          orderId: order._id,
          deliveryBoyId: boy._id,
          restaurantId: order.restaurantId._id,
          userId: order.userId._id,
          pickupDistance,
          dropDistance
        });
        assignments.push(assignment);
      }
    }

    return res.status(201).json({
      success: true,
      message: assignments.length > 0
        ? "Order assigned to nearby delivery boys (8km)"
        : "No delivery boys available within 8km",
      data: assignments
    });

  } catch (error) {
    console.error("assignOrder error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const { assignmentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(assignmentId))
      return res.status(400).json({ success: false, message: "Valid assignmentId is required." });

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment)
      return res.status(404).json({ success: false, message: "Assignment not found." });

    if (assignment.status !== "Pending") {
      return res.status(400).json({ success: false, message: `Order already ${assignment.status}` });
    }

    // Fetch order with user, user address, restaurant, and order items
    const order = await Order.findById(assignment.orderId)
      .populate({
        path: "userId",
        select: " location " // include address/location
      })
      .populate({
        path: "restaurantId",
        select: "restaurantName location address" // restaurant info + address
      })
      .lean();

    if (!order) return res.status(404).json({ success: false, message: "Order not found." });

    // Store full details in assignment
    assignment.status = "Accepted";
    assignment.acceptedAt = new Date();
    assignment.orderDetails = order;            // full order info including items
    assignment.userDetails = order.userId;     // user info + address
    assignment.restaurantDetails = order.restaurantId; // restaurant info + address

    await assignment.save();

    return res.status(200).json({
      success: true,
      message: "Order accepted successfully with full details stored",
      data: assignment
    });

  } catch (error) {
    console.error("acceptOrder error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
exports.assignDeliveryAndTrack = async (req, res) => {
   try {
    const { deliveryBoyId, status } = req.body;

    // Validate deliveryBoyId
    if (!mongoose.Types.ObjectId.isValid(deliveryBoyId))
      return res.status(400).json({ success: false, message: "Valid deliveryBoyId is required." });

    // Validate status if provided
    const allowedStatuses = ["Accepted", "Picked", "Delivered"];
    if (status && !allowedStatuses.includes(status))
      return res.status(400).json({ success: false, message: `Status must be one of: ${allowedStatuses.join(", ")}` });

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy || !deliveryBoy.location?.coordinates) {
      return res.status(404).json({ success: false, message: "Delivery boy location not found." });
    }

    const [boyLon, boyLat] = deliveryBoy.location.coordinates;

    // Fetch active assignment
    const assignment = await DeliveryAssignment.findOne({
      deliveryBoyId,
      status: { $in: ["Accepted", "Picked"] }
    }).populate("restaurantId userId");

    if (!assignment) {
      return res.status(200).json({ success: true, message: "No active delivery." });
    }

    // Update status if provided
    if (status) assignment.status = status;

    // Calculate distances using DB-stored location
    const restLoc = assignment.restaurantId.location.coordinates;
    const userLoc = assignment.userId.location.coordinates;

    const pickupDistance = parseFloat(calculateDistanceKm(boyLat, boyLon, restLoc[1], restLoc[0]).toFixed(2));
    const dropDistance = parseFloat(calculateDistanceKm(restLoc[1], restLoc[0], userLoc[1], userLoc[0]).toFixed(2));

    assignment.pickupDistance = pickupDistance;
    assignment.dropDistance = dropDistance;

    await assignment.save();

    return res.status(200).json({
      success: true,
      message: "Delivery assignment updated successfully",
      data: assignment
    });

  } catch (error) {
    console.error("assignDeliveryAndTrack error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { assignmentId, status } = req.body;
    if (!["Picked", "Delivered"].includes(status))
      return res.status(400).json({ success: false, message: "Invalid status." });

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found." });
    if (assignment.status === "Cancelled")
      return res.status(400).json({ success: false, message: "Order cancelled." });

    assignment.status = status;
    if (status === "Delivered") assignment.deliveredAt = new Date();
    await assignment.save();

    return res.status(200).json({ success: true, message: `Order ${status}`, data: assignment });

  } catch (error) {
    console.error("updateDeliveryStatus error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


exports.getDailyStats = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayOrders = await DeliveryAssignment.countDocuments({ createdAt: { $gte: startOfDay } });
    const cancelledOrders = await DeliveryAssignment.countDocuments({ status: "Cancelled", updatedAt: { $gte: startOfDay } });
    const completedOrders = await DeliveryAssignment.countDocuments({ status: "Delivered", deliveredAt: { $gte: startOfDay } });

    return res.status(200).json({
      success: true,
      data: { todayOrders, cancelledOrders, completedOrders }
    });

  } catch (error) {
    console.error("getDailyStats error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

