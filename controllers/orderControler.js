const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const User = require("../models/userModel"); // For delivery info
const cloudinary = require('../config/cloudinary');
// -------------------- PRODUCT CONTROLLERS --------------------

// Create Product

// ✅ CREATE Product
exports.createProduct = async (req, res) => {
  try {
    let imageUrl = "";

    // Upload image to Cloudinary if present
    if (req.file && req.file.path) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'products'
      });
      imageUrl = result.secure_url;
    }

    const productData = {
      ...req.body,
      image: imageUrl
    };

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: errors });
    }
    res.status(500).json({ success: false, message: "Error creating product", error: err.message });
  }
};



// ✅ GET All Products (populate restaurant name)
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("restaurantId", "restaurantName location image");

    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch products", error: err.message });
  }
};


// ✅ GET Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate("restaurantId", "restaurantName location image");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching product", error: err.message });
  }
};


// ✅ GET Products by Category
exports.getProductByCategory = async (req, res) => {
  try {
    const category = req.params.category;

    const products = await Product.find({ category });

    if (!products.length) {
      return res.status(404).json({
        success: false,
        message: `No products found in '${category}' category`
      });
    }

    res.status(200).json({
      success: true,
      message: `Products in '${category}' category`,
      data: products
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error fetching products by category",
      error: err.message
    });
  }
};


// ✅ SEARCH Products
exports.searchProducts = async (req, res) => {
  try {
    const { keyword } = req.query;
    const regex = new RegExp(keyword, "i");

    const products = await Product.find({
      $or: [
        { name: regex },
        { category: regex },
        { description: regex },
        { image: regex }
      ]
    });

    res.status(200).json({
      success: true,
      results: products.length,
      data: products
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error searching products",
      error: err.message
    });
  }
};


// ✅ UPDATE Product
exports.updateProduct = async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.productId,
      req.body,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating product", error: err.message });
  }
};


// ✅ DELETE Product
exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.productId);

    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting product", error: err.message });
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