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


// Create Restaurant with Image Upload
// @desc    Create a new restaurant
// @route   POST /api/restaurants
// @access  Private/Admin
exports.createRestaurant = async (req, res) => {
  try {
    const { restaurantName, description, location, rating, startingPrice } = req.body;

    // Validate required fields
    if (!restaurantName || !location || !startingPrice || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name, location, starting price, and image are required"
      });
    }

    let parsedLocation;
    try {
      parsedLocation = JSON.parse(location);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid location format. Must be a valid JSON string"
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "restaurants",
      width: 1500,
      crop: "scale"
    });

    const restaurant = await Restaurant.create({
      restaurantName,
      description,
      rating,
      startingPrice,
      location: parsedLocation,
      image: {
        public_id: result.public_id,
        url: result.secure_url
      }
    });

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      success: true,
      data: restaurant
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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
      startingPrice: req.body.startingPrice || restaurant.startingPrice,
      location: req.body.location ? JSON.parse(req.body.location) : restaurant.location
    };

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
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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



// @access  Public
exports.getTopRatedRestaurants = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5; // Default to top 5

    const topRestaurants = await Restaurant.find({ rating: { $gt: 4 } }) // Only ratings above 4.5
      .sort({ rating: -1 })
      .limit(limit)
      .select('-startingPrice'); // Exclude startingPrice field

    res.status(200).json({
      success: true,
      count: topRestaurants.length,
      data: topRestaurants
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
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

    // Step 1: Find user by ID
    const user = await User.findById(userId);

    if (!user || !user.location || !Array.isArray(user.location.coordinates)) {
      return res.status(404).json({ success: false, message: 'User or location not found' });
    }

    const userCoordinates = user.location.coordinates;

    // Step 2: Find restaurants near the user within 5km
    const nearbyRestaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: userCoordinates
          },
          $maxDistance: 5000 // meters = 5km
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Nearby restaurants found',
      data: nearbyRestaurants
    });
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};