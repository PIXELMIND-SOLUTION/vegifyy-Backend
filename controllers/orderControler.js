const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const RestaurantProduct = require("../models/restaurantProductModel");
const User = require("../models/userModel");
const cloudinary = require('../config/cloudinary');
const mongoose = require("mongoose");
const fs = require("fs");



// Haversine formula for distance
const calculateDistance = (coord1, coord2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

exports.createProduct = async (req, res) => {
    try {
    let {
      description,
      locationname,
      contentname,
      userId,
      RestaurantProductId,
      reviews,
      addons,
      type,
      rating,
      viewcount,
    } = req.body;

    const vendorHalfPercentage = 50;
    const vendor_Platecost = 5;

    const user = await User.findById(userId);
    const restaurantProduct = await RestaurantProduct.findById(RestaurantProductId).populate("restaurantId");

    if (!user || !restaurantProduct) {
      return res.status(400).json({
        success: false,
        message: "User or RestaurantProduct not found"
      });
    }

    // Get product name & price from recommended array
    const recommendedItem = restaurantProduct.recommended?.[0];
    const productName = recommendedItem?.name?.trim() || "Unnamed Product";
    const productPrice = Number(recommendedItem?.price) || 0;
    const price = productPrice;

    // Upload product images
    let productImages = [];
    if (req.files?.productImages) {
      const images = Array.isArray(req.files.productImages) ? req.files.productImages : [req.files.productImages];
      for (const file of images) {
        const result = await cloudinary.uploader.upload(file.path);
        productImages.push(result.secure_url);
      }
    }

    // Upload review images
    let reviewImages = [];
    if (req.files?.reviewImages) {
      const images = Array.isArray(req.files.reviewImages) ? req.files.reviewImages : [req.files.reviewImages];
      for (const file of images) {
        const result = await cloudinary.uploader.upload(file.path);
        reviewImages.push(result.secure_url);
      }
    }

    // Parse reviews
    let parsedReviews = [];
    if (reviews) {
      parsedReviews = JSON.parse(reviews);
      parsedReviews.forEach((rev, i) => {
        if (reviewImages[i]) rev.image = reviewImages[i];
      });
    }

    // Remove addonImage upload code here
    // let addonImageCloud = { public_id: "", url: "" };
    // if (req.files?.addonImage) { ... }  <-- Remove all this block

    // Parse and construct addons without addonImage
    let parsedAddons = {};
    if (addons) {
      const parsed = JSON.parse(addons);
      const plateItemCount = Number(parsed.plates?.item) || 0;
      const totalPlatesPrice = plateItemCount * vendor_Platecost;

      let variationPrice = 0;
      const variationType = parsed.variation?.type?.toLowerCase();

      if (variationType === "full") {
        variationPrice = productPrice;
      } else if (variationType === "half") {
        variationPrice = productPrice - (productPrice * vendorHalfPercentage / 100);
      }

      parsedAddons = {
        productName: productName,
        variation: {
          name: parsed.variation?.name || "",
          type: parsed.variation?.type || "",
          vendorPercentage: vendorHalfPercentage,
          price: variationPrice,
        },
        plates: {
          name: parsed.plates?.name || "",
          item: plateItemCount,
          platePrice: vendor_Platecost,
          totalPlatesPrice: totalPlatesPrice,
        },
        // Remove addonImage from here
        // addonImage: addonImageCloud,
      };
    }

    // Calculate delivery time
    let deliveryTime = null;
    const restaurantCoordinates = restaurantProduct?.restaurantId?.location?.coordinates;
    const userCoordinates = user?.location?.coordinates;

    if (restaurantCoordinates && userCoordinates) {
      const dist = calculateDistance(restaurantCoordinates, userCoordinates);
      const estimatedTime = Math.round(dist * 2); // 2 min per km
      deliveryTime = estimatedTime > 60 ? "60+ mins" : `${estimatedTime} mins`;
    }

    const parsedLocation = JSON.parse(locationname || "[]");
    const parsedType = JSON.parse(type || "[]");

    // Save product
    const product = await Product.create({
      productName: productName,
      productPrice: productPrice,
      description,
      image: productImages,
      locationname: parsedLocation,
      contentname,
      userId,
      reviews: parsedReviews,
      vendorHalfPercentage,
      vendor_Platecost,
      rating: Number(rating) || 0,
      viewcount: Number(viewcount) || 0,
      type: parsedType,
      addons: parsedAddons,  // no addonImage here now
      deliverytime: deliveryTime,
      restaurantProduct: {
        product: restaurantProduct._id,
        productName: productName,
        quantity: 1,
        price: price,
      },
    });

    const productObj = product.toObject();
    delete productObj.vendorHalfPercentage;
    delete productObj.vendor_Platecost;

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: productObj,
    });

  } catch (err) {
    console.error("❌ Product creation error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
// ✅ GET all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("❌ Get all products error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};



// ✅ GET product by ID
exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    console.error("❌ Get product by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};



exports.updateProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    // Fetch existing product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Extract fields from req.body (only update fields that are present)
    const updateData = {};

    const updatableFields = [
      "description",
      "locationname",
      "contentname",
      "userId",
      "RestaurantProductId",
      "reviews",
      "addons",
      "type",
      "rating",
      "viewcount"
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    // Parse JSON fields if sent as strings
    if (typeof updateData.locationname === "string") {
      try {
        updateData.locationname = JSON.parse(updateData.locationname);
      } catch {
        updateData.locationname = [];
      }
    }
    if (typeof updateData.type === "string") {
      try {
        updateData.type = JSON.parse(updateData.type);
      } catch {
        updateData.type = [];
      }
    }
    if (typeof updateData.reviews === "string") {
      try {
        updateData.reviews = JSON.parse(updateData.reviews);
      } catch {
        updateData.reviews = [];
      }
    }
    if (typeof updateData.addons === "string") {
      try {
        updateData.addons = JSON.parse(updateData.addons);
      } catch {
        updateData.addons = {};
      }
    }

    // Handle image uploads if present
    if (req.files?.productImages) {
      const images = Array.isArray(req.files.productImages) ? req.files.productImages : [req.files.productImages];
      const productImages = [];
      for (const file of images) {
        const result = await cloudinary.uploader.upload(file.path);
        productImages.push(result.secure_url);
      }
      updateData.image = productImages;
    }

    if (req.files?.reviewImages) {
      const images = Array.isArray(req.files.reviewImages) ? req.files.reviewImages : [req.files.reviewImages];
      const reviewImages = [];
      for (const file of images) {
        const result = await cloudinary.uploader.upload(file.path);
        reviewImages.push(result.secure_url);
      }
      if (updateData.reviews && Array.isArray(updateData.reviews)) {
        updateData.reviews.forEach((rev, i) => {
          if (reviewImages[i]) rev.image = reviewImages[i];
        });
      }
    }

    // Update vendorHalfPercentage and vendor_Platecost only if sent
    if (req.body.vendorHalfPercentage !== undefined) {
      updateData.vendorHalfPercentage = Number(req.body.vendorHalfPercentage);
    }
    if (req.body.vendor_Platecost !== undefined) {
      updateData.vendor_Platecost = Number(req.body.vendor_Platecost);
    }

    // Calculate deliverytime again if userId or RestaurantProductId is updated
    if (updateData.userId || updateData.RestaurantProductId) {
      const user = await User.findById(updateData.userId || product.userId);
      const restaurantProduct = await RestaurantProduct.findById(updateData.RestaurantProductId || product.RestaurantProductId).populate("restaurantId");

      if (user && restaurantProduct) {
        const restaurantCoordinates = restaurantProduct?.restaurantId?.location?.coordinates;
        const userCoordinates = user?.location?.coordinates;

        if (restaurantCoordinates && userCoordinates) {
          const dist = calculateDistance(restaurantCoordinates, userCoordinates);
          const estimatedTime = Math.round(dist * 2);
          updateData.deliverytime = estimatedTime > 60 ? "60+ mins" : `${estimatedTime} mins`;
        }
      }
    }

    // Update the product document
    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });

  } catch (error) {
    console.error("❌ Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ✅ DELETE product
exports.deleteProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Optionally: Delete images from cloudinary if stored public_ids are saved

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: product,
    });
  } catch (error) {
    console.error("❌ Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// 1. Toggle Wishlist (Add/Remove)
exports.addToWishlist = async (req, res) => {
  const { userId } = req.params;
  const { productId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const exists = user.myWishlist.includes(productId);

    if (exists) {
      user.myWishlist = user.myWishlist.filter(id => id.toString() !== productId);
      await user.save();
      return res.status(200).json({
        message: "Product removed from wishlist",
        isInWishlist: false,
        wishlist: user.myWishlist
      });
    } else {
      user.myWishlist.push(productId);
      await user.save();
      return res.status(200).json({
        message: "Product added to wishlist",
        isInWishlist: true,
        wishlist: user.myWishlist
      });
    }
  } catch (error) {
    console.error("Wishlist toggle error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// 2. Get Wishlist
exports.getWishlist = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate("myWishlist");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ wishlist: user.myWishlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// 3. Remove Specific Product
exports.removeFromWishlist = async (req, res) => {
  const { userId, productId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.myWishlist = user.myWishlist.filter(id => id.toString() !== productId);
    await user.save();

    res.status(200).json({ message: "Product removed", wishlist: user.myWishlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// -------------------- ORDER CONTROLLERS --------------------

// Create Order
exports.createOrder = async (req, res) => {
  try {
    const { userId, items, totalAmount } = req.body;

    if (!userId || !Array.isArray(items) || items.length === 0 || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Please provide userId, items (array), and totalAmount"
      });
    }

    const newOrder = await Order.create({ userId, items, totalAmount });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: newOrder
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error placing order",
      error: err.message
    });
  }
};
// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "fullName phoneNumber email") // Optional projection
      .populate("items.productId", "name price image");

    res.status(200).json({
      success: true,
      results: orders.length,
      data: orders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: err.message
    });
  }
};


// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("userId", "fullName phoneNumber email")
      .populate("items.productId", "name price image");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching order",
      error: err.message
    });
  }
};


// Update order
exports.updateOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.orderId,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Order updated",
      data: updated
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating order",
      error: err.message
    });
  }
};


// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.orderId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Order deleted"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error deleting order",
      error: err.message
    });
  }
};


// Vendor accept order
exports.vendorAcceptOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.orderId, { status: "confirmed" }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Order not found" });

    res.status(200).json({ success: true, message: "Order accepted by vendor", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error confirming order", error: err.message });
  }
};

// Assign delivery partner
exports.assignDeliveryAndTrack = async (req, res) => {
  try {
    const { deliveryUserId, eta } = req.body;
    const deliveryUser = await User.findById(deliveryUserId);
    if (!deliveryUser) return res.status(404).json({ success: false, message: "Delivery user not found" });

    const updatedOrder = await Order.findByIdAndUpdate(req.params.orderId, {
      deliveryUserId,
      deliveryEta: eta,
      status: "ongoing"
    }, { new: true });

    res.status(200).json({
      success: true,
      message: "Delivery partner assigned",
      data: {
        order: updatedOrder,
        deliveryPerson: {
          name: deliveryUser.fullName,
          phone: deliveryUser.phoneNumber,
          eta
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error assigning delivery partner", error: err.message });
  }
};


// ✅ GET: Today's Bookings by User
exports.getTodaysBookingsByUser = async (req, res) => {
  try {
    // Get userId from params or token
    const userId = req.params.userId || req.user?.id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // Define today's start and end time
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Query today's orders for specific user
    const orders = await Order.find({
      userId: userId,
      orderDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
      .populate("userId", "fullName phoneNumber email")
      .populate("items.productId", "name price image");

    res.status(200).json({
      success: true,
      message: "Today's bookings for the user fetched successfully",
      results: orders.length,
      data: orders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching today's bookings for the user",
      error: err.message
    });
  }
};

// ✅ POST: Get Orders by Status
exports.getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status"
      });
    }

    const orders = await Order.find({ status })
      .populate("userId", "fullName phoneNumber email")
      .populate("items.productId", "name price image");

    res.status(200).json({
      success: true,
      message: `Orders with status '${status}' fetched successfully`,
      results: orders.length,
      data: orders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders by status",
      error: err.message
    });
  }
};