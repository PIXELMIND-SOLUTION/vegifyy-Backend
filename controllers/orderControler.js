const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const RestaurantProduct = require("../models/restaurantProductModel");
const User = require("../models/userModel");
const Cart = require("../models/cartModel");
const Restaurant = require("../models/restaurantModel");
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
    const { userId, cartId, restaurantId, paymentMethod, paymentStatus } = req.body;

    // 1. Validate IDs
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }
    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      return res.status(400).json({ success: false, message: "Invalid cartId" });
    }
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ success: false, message: "Invalid restaurantId" });
    }
    if (!["COD", "Online"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Invalid payment method" });
    }
    if (paymentStatus && !["Pending", "Paid", "Failed"].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: "Invalid payment status" });
    }

    // 2. Fetch cart
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }
    if (cart.userId.toString() !== userId) {
      return res.status(400).json({ success: false, message: "Cart does not belong to user" });
    }

    // 3. Get restaurant location and name
    const restaurant = await Restaurant.findById(restaurantId, "locationName restaurantName");
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    // 4. Get user delivery address
    const user = await User.findById(userId);
    if (!user || !user.address || user.address.length === 0) {
      return res.status(404).json({ success: false, message: "User address not found" });
    }
    const deliveryAddress = user.address[0];

    // 5. Prepare order data including products snapshot from cart
    const orderData = {
      userId,
      cartId,
      restaurantId,
      restaurantLocation: restaurant.locationName || "",
      deliveryAddress,
      paymentMethod,
      paymentStatus: paymentStatus || "Pending",
      orderStatus: "Pending",
      totalItems: cart.totalItems,
      subTotal: cart.subTotal,
      deliveryCharge: cart.deliveryCharge,
      totalPayable: cart.finalAmount,
      products: cart.products.map(p => ({
        restaurantProductId: p.restaurantProductId,
        recommendedId: p.recommendedId,
        quantity: p.quantity,
        name: p.name,
        basePrice: p.basePrice,
        addons: p.addons,
        image: p.image,
      })),
    };

    // 6. Create order
    let order = await Order.create(orderData);

    // 7. Populate restaurant details before sending response
    order = await Order.findById(order._id)
      .populate("restaurantId", "restaurantName locationName");

    // 8. Build response message
    let message = "Order created successfully";
    if (paymentStatus === "Paid") {
      message = "Payment is successful";
    }

    return res.status(201).json({
      success: true,
      message,
      data: {
        orderId: order._id,
        totalItems: order.totalItems,
        subTotal: order.subTotal,
        deliveryCharge: order.deliveryCharge,
        totalPayable: order.totalPayable,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        restaurantLocation: order.restaurantLocation,
        restaurantDetails: order.restaurantId,
        products: order.products
      }
    });

  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
// -------------------------
// GET ALL ORDERS
// -------------------------

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email") // populate user info
      .populate("restaurantId", "restaurantName locationName") // populate restaurant info
      .populate("cartId") // populate full cart details if needed
      .sort({ createdAt: -1 }); // latest orders first

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error("getAllOrders error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// -------------------------
// GET ORDERS BY USER ID
// -------------------------
exports.getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const orders = await Order.find({ userId })
      .populate("restaurantId", "name locationName");

    if (!orders.length) {
      return res.status(404).json({ success: false, message: "No orders found for this user" });
    }

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error("getOrdersByUserId error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// -------------------------
// UPDATE ORDER BY USER ID
// -------------------------
exports.updateOrderByUserId = async (req, res) => {
  try {
    const { userId, orderId } = req.params;
    const { paymentStatus, orderStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid orderId" });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found for this user" });
    }

    // Update only allowed fields
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (orderStatus) order.orderStatus = orderStatus;

    // If payment is successful, zero out amounts
    if (paymentStatus === "Paid") {
      order.subTotal = 0;
      order.deliveryCharge = 0;
      order.totalPayable = 0;
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order
    });
  } catch (error) {
    console.error("updateOrderByUserId error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// -------------------------
// DELETE ORDER BY USER ID
// -------------------------
exports.deleteOrderByUserId = async (req, res) => {
  try {
    const { userId, orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid orderId" });
    }

    const order = await Order.findOneAndDelete({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found for this user" });
    }

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      deletedOrderId: orderId
    });
  } catch (error) {
    console.error("deleteOrderByUserId error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
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
exports.getTodaysBookingsByUserId = async (req, res) => {
  // Define the helper function inside this method
  const getTodayDateRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const { start, end } = getTodayDateRange();

    const orders = await Order.find({
      userId,
      createdAt: { $gte: start, $lte: end }
    }).populate("restaurantId", "restaurantName locationName");

    return res.status(200).json({
      success: true,
      message: `Today's bookings fetched successfully for user ${userId}`,
      data: orders
    });
  } catch (error) {
    console.error("getTodaysBookingsByUserId error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ✅ POST: Get Orders by Status
exports.getOrdersByStatus = async (req, res) => {
  try {
    const { orderStatus } = req.query; // <-- get from query params

    const validStatuses = ["Pending", "Confirmed", "Preparing", "Delivered", "Cancelled"];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    const orders = await Order.find({ orderStatus }).populate("restaurantId", "restaurantName locationName");

    return res.status(200).json({
      success: true,
      message: `Orders with status "${orderStatus}" fetched successfully`,
      data: orders
    });
  } catch (error) {
    console.error("getOrdersByStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};