const { Category, VegFood } = require("../models/foodSystemModel");
const Cart=require("../models/cartModel");
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Restaurant = require("../models/restaurantModel");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// CATEGORY SECTION

exports.createCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "Image is required" });

    const uploaded = await cloudinary.uploader.upload(file.path, { folder: "categories" });
    fs.unlinkSync(file.path);

    const category = await Category.create({ categoryName, imageUrl: uploaded.secure_url });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// FOOD SECTION

exports.createVegFood = async (req, res) => {
  try {
    const { name, price, rating, reviewCount, description, categoryId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ status: false, message: "Image is required" });

    // ✅ Upload to Cloudinary
    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: "vegFoods"
    });

    // ✅ Delete local file
    fs.unlinkSync(file.path);

    // ✅ Save to DB
    const food = await VegFood.create({
      name,
      price,
      rating,
      reviewCount,
      description,
      image: uploaded.secure_url,
      isVeg: true,
      categoryId
    });

    res.status(201).json({
      status: true,
      message: "Veg food created successfully",
      data: food
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Server error",
      error: err.message
    });
  }
};

// ✅ Get All Veg Foods (with optional ?categoryId=)
exports.getAllVegFoods = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const whereClause = { isVeg: true };
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const foods = await VegFood.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          attributes: ["id", "categoryName", "imageUrl"]
        }
      ]
    });

    res.status(200).json({ status: true, data: foods });
  } catch (err) {
    res.status(500).json({ status: false, message: "Server error", error: err.message });
  }
};
// CART SECTION
// 🟢 Add to Cart
exports.addToCart = async (req, res) => {
  const { userId, productId, quantity, price } = req.body;

  try {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, products: [] });
    }

    const index = cart.products.findIndex(
      (item) => item.product.toString() === productId
    );

    if (index > -1) {
      cart.products[index].quantity += quantity;
    } else {
      cart.products.push({ product: productId, quantity, price });
    }

    // 🧮 Recalculate
    cart.subTotal = cart.products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    cart.deliveryCharge = 20;
    cart.finalAmount = cart.subTotal + cart.deliveryCharge;
    cart.cartTotal = cart.products.length;
    cart.totalPrice = cart.finalAmount;

    await cart.save();

    res.status(200).json({ message: "Product added to cart", cart });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔵 Get Cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId }).populate("products.product");

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    res.status(200).json({ cart });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🟡 Update Quantity
exports.updateCartItem = async (req, res) => {
  const { userId, productId } = req.params;
  const { quantity } = req.body;

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.products.find(
      (p) => p.product.toString() === productId
    );
    if (!item) return res.status(404).json({ message: "Product not in cart" });

    item.quantity = quantity;

    // Recalculate
    cart.subTotal = cart.products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );
    cart.finalAmount = cart.subTotal + cart.deliveryCharge;
    cart.totalPrice = cart.finalAmount;

    await cart.save();

    res.status(200).json({ message: "Cart updated", cart });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔴 Remove Item
exports.removeFromCart = async (req, res) => {
  const { userId, productId } = req.params;

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.products = cart.products.filter(
      (p) => p.product.toString() !== productId
    );

    // Recalculate
    cart.subTotal = cart.products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );
    cart.finalAmount = cart.subTotal + cart.deliveryCharge;
    cart.totalPrice = cart.finalAmount;
    cart.cartTotal = cart.products.length;

    await cart.save();

    res.status(200).json({ message: "Product removed from cart", cart });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.createRestaurant = async (req, res) => {
  try {
    const { restaurantName, description, location, rating } = req.body;
    
    // Validate required fields
    if (!restaurantName || !location || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name, location, and image are required"
      });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "restaurants",
      width: 1500,
      crop: "scale"
    });

    // Create restaurant with Cloudinary URL
    const restaurant = await Restaurant.create({
      restaurantName,
      description,
      rating,
      location: JSON.parse(location), // Assuming location is sent as JSON string
      image: {
        public_id: result.public_id,
        url: result.secure_url
      }
    });

    // Delete temporary file
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      success: true,
      data: restaurant
    });

  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path); // Clean up if error occurs
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
exports.getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// @desc    Get single restaurant
// @route   GET /api/restaurants/:id
// @access  Public
exports.getRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found"
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// @desc    Update restaurant
// @route   PUT /api/restaurants/:id
// @access  Private/Admin
exports.updateRestaurant = async (req, res) => {
  try {
    let restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found"
      });
    }

    const data = {
      restaurantName: req.body.restaurantName || restaurant.restaurantName,
      description: req.body.description || restaurant.description,
      rating: req.body.rating || restaurant.rating,
      location: req.body.location ? JSON.parse(req.body.location) : restaurant.location
    };

    // Handle image update if new file is provided
    if (req.file) {
      // Delete old image from Cloudinary
      await cloudinary.uploader.destroy(restaurant.image.public_id);

      // Upload new image
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "restaurants",
        width: 1500,
        crop: "scale"
      });

      data.image = {
        public_id: result.public_id,
        url: result.secure_url
      };

      // Delete temporary file
      fs.unlinkSync(req.file.path);
    }

    restaurant = await Restaurant.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: restaurant
    });

  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path); // Clean up if error occurs
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// @desc    Delete restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private/Admin
exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found"
      });
    }

    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(restaurant.image.public_id);

    await restaurant.remove();

    res.status(200).json({
      success: true,
      message: "Restaurant deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

//**
// * @desc    Get restaurants near a user's location
 //* @route   GET /api/restaurants/nearby/:userId
// * @access  Public
// * @param   {string} userId - User ID to get location from
 //* @param   {number} [distance=10] - Maximum distance in kilometers (optional)
 //* @returns {Object} List of nearby restaurants with count
 
exports.getNearbyRestaurants = async (req, res) => {
  try {

    const { userId } = req.params;
    let maxDistance = parseFloat(req.query.distance) || 10; // Default: 10km

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    // Validate distance parameter
    if (isNaN(maxDistance) || maxDistance <= 0) {
      return res.status(400).json({
        success: false,
        message: "Distance must be a positive number",
      });
    }

    // Find user and validate location
    const user = await User.findById(userId).select('location');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user?.location?.coordinates) {
      return res.status(400).json({
        success: false,
        message: "User location not available",
      });
    }

    // Validate coordinates format
    const [longitude, latitude] = user.location.coordinates;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid user coordinates",
      });
    }

    // Find nearby restaurants with pagination
    const nearbyRestaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: user.location.coordinates,
          },
          $maxDistance: maxDistance * 1000, // Convert km to meters
        },
      },
    })
    .select('-__v') // Exclude version key
    .limit(100); // Limit results for performance

    res.status(200).json({
      success: true,
      count: nearbyRestaurants.length,
      maxDistance: `${maxDistance} km`,
      userLocation: user.location.coordinates,
      data: nearbyRestaurants,
    });
  } catch (err) {
  
    console.error('Error fetching nearby restaurants:', err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching nearby restaurants",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};