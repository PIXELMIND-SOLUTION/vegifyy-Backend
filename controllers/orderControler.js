const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Restaurant = require('../models/restaurantModel');
const User = require("../models/userModel");
const cloudinary = require('../config/cloudinary');
const mongoose = require("mongoose");

function calculateDistance(coord1, coord2) {
  const toRad = deg => deg * Math.PI / 180;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

exports.createProduct = async (req, res) => {
  try {
    const { userId, restaurantId } = req.body;

    // Step 1: Validate IDs
    if (!userId || !restaurantId) {
      return res.status(400).json({ success: false, message: "userId and restaurantId are required" });
    }

    const user = await User.findById(userId);
    const restaurant = await Restaurant.findById(restaurantId);

    if (!user || !restaurant) {
      return res.status(404).json({ success: false, message: "User or Restaurant not found" });
    }

    // Step 2: Calculate Delivery Time
    const userCoords = user.location?.coordinates;
    const restaurantCoords = restaurant.location?.coordinates;
    if (!userCoords || !restaurantCoords) {
      return res.status(400).json({ success: false, message: "Missing coordinates for user or restaurant" });
    }

    const distance = calculateDistance(userCoords, restaurantCoords);
    let deliverytime = '60+ mins';
    if (distance <= 2) deliverytime = '15 mins';
    else if (distance <= 5) deliverytime = '30 mins';
    else if (distance <= 10) deliverytime = '45 mins';
    else if (distance <= 20) deliverytime = '60 mins';

    // Step 3: Upload product images
    let imageUrls = [];
    if (req.files?.productImages?.length) {
      for (const file of req.files.productImages) {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'products' });
        imageUrls.push(result.secure_url);
      }
    }

    // Step 4: Parse addOns
    let addOns = [];
    if (req.body.addOns) {
      try {
        addOns = JSON.parse(req.body.addOns);
        for (const addOn of addOns) {
          if (!addOn.name || addOn.price == null) {
            return res.status(400).json({ success: false, message: "Each add-on must have name and price" });
          }
        }
      } catch {
        return res.status(400).json({ success: false, message: "addOns must be valid JSON" });
      }
    }

    // Step 5: Parse reviews & upload review images
    let reviews = [];
    if (req.body.reviews) {
      try {
        reviews = JSON.parse(req.body.reviews);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid reviews format" });
      }

      const reviewImageFiles = req.files?.reviewImages || [];
      for (let i = 0; i < reviews.length; i++) {
        const file = reviewImageFiles[i];
        if (file) {
          const result = await cloudinary.uploader.upload(file.path, { folder: 'reviews' });
          reviews[i].image = result.secure_url;
        }
      }
    }

    // Step 6: Validate required fields
    const requiredFields = ['name', 'price', 'locationname', 'contentname'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
      }
    }

    // Step 7: Create product
    const product = await Product.create({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description || '',
      image: imageUrls,
      variation: req.body.variation || 'Full',
      userId: new mongoose.Types.ObjectId(userId), 
      restaurantId:  new mongoose.Types.ObjectId(restaurantId), 
      locationname: req.body.locationname,
      contentname: req.body.contentname,
      deliverytime,
      addOns,
      reviews,
      viewcount: 0,
      rating: 0
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, message: "Error creating product", error: err.message });
  }
};


// ✅ GET all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('userId restaurantId');
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch products", error: err.message });
  }
};


// ✅ GET product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('userId restaurantId');
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch product", error: err.message });
  }
};


exports.updateProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, restaurantId } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Optional: Check userId/restaurantId if passed
    if (userId && !await User.findById(userId)) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (restaurantId && !await Restaurant.findById(restaurantId)) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    // Recalculate delivery time if user or restaurant ID changed
    let deliverytime = product.deliverytime;
    if (userId && restaurantId) {
      const user = await User.findById(userId);
      const restaurant = await Restaurant.findById(restaurantId);
      const userCoords = user.location?.coordinates;
      const restaurantCoords = restaurant.location?.coordinates;
      if (userCoords && restaurantCoords) {
        const distance = calculateDistance(userCoords, restaurantCoords);
        deliverytime = '60+ mins';
        if (distance <= 2) deliverytime = '15 mins';
        else if (distance <= 5) deliverytime = '30 mins';
        else if (distance <= 10) deliverytime = '45 mins';
        else if (distance <= 20) deliverytime = '60 mins';
      }
    }

    // Upload new product images (if provided)
    let imageUrls = product.image;
    if (req.files?.productImages?.length) {
      imageUrls = [];
      for (const file of req.files.productImages) {
        const result = await cloudinary.uploader.upload(file.path, { folder: 'products' });
        imageUrls.push(result.secure_url);
      }
    }

    // Parse addOns
    let addOns = product.addOns;
    if (req.body.addOns) {
      try {
        addOns = JSON.parse(req.body.addOns);
        for (const addOn of addOns) {
          if (!addOn.name || addOn.price == null) {
            return res.status(400).json({ success: false, message: "Each add-on must have name and price" });
          }
        }
      } catch {
        return res.status(400).json({ success: false, message: "addOns must be valid JSON" });
      }
    }

    // Parse reviews and review image uploads
    let reviews = product.reviews;
    if (req.body.reviews) {
      try {
        reviews = JSON.parse(req.body.reviews);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid reviews format" });
      }

      const reviewImageFiles = req.files?.reviewImages || [];
      for (let i = 0; i < reviews.length; i++) {
        const file = reviewImageFiles[i];
        if (file) {
          const result = await cloudinary.uploader.upload(file.path, { folder: 'reviews' });
          reviews[i].image = result.secure_url;
        }
      }
    }

    // Update product fields
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name: req.body.name || product.name,
        price: req.body.price || product.price,
        description: req.body.description ?? product.description,
        image: imageUrls,
        variation: req.body.variation || product.variation,
        userId: userId ? new mongoose.Types.ObjectId(userId) : product.userId,
        restaurantId: restaurantId ? new mongoose.Types.ObjectId(restaurantId) : product.restaurantId,
        locationname: req.body.locationname || product.locationname,
        contentname: req.body.contentname || product.contentname,
        deliverytime,
        addOns,
        reviews,
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: "Product updated successfully", data: updatedProduct });
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, message: "Error updating product", error: err.message });
  }
};
// ✅ DELETE product
exports.deleteProductById = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete product", error: err.message });
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


// ✅ GET: Today's Bookings
exports.getTodaysBookings = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      orderDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate("userId", "fullName phoneNumber email")
      .populate("items.productId", "name price image");

    res.status(200).json({
      success: true,
      message: "Today's bookings fetched successfully",
      results: orders.length,
      data: orders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching today's bookings",
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