// controllers/restaurantController.js
const { Category, VegFood } = require("../models/foodSystemModel");
const Cart = require("../models/cartModel");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Restaurant = require("../models/restaurantModel");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");


// CATEGORY SECTION
exports.createCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "Image is required" });

    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: "categories"
    });
    fs.unlinkSync(file.path);

    const category = await Category.create({ categoryName, imageUrl: uploaded.secure_url });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createVegFood = async (req, res) => {
  try {
    const { name, rating, type, locationName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ status: false, message: "Image is required" });
    }

    // Upload image to Cloudinary
    const uploaded = await cloudinary.uploader.upload(file.path, { folder: "vegFoods" });
    fs.unlinkSync(file.path); // Remove local file

    const food = await VegFood.create({
      name,
      rating,
      type,
      locationName,
      image: uploaded.secure_url // ✅ Save image
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

// Get all
exports.getAllVegFoods = async (req, res) => {
  try {
    const foods = await VegFood.find().sort({ createdAt: -1 });
    res.status(200).json({ status: true, data: foods });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error", error: error.message });
  }
};

// Get by ID
exports.getVegFoodById = async (req, res) => {
  try {
    const food = await VegFood.findById(req.params.id);
    if (!food) return res.status(404).json({ status: false, message: "Veg food not found" });

    res.status(200).json({ status: true, data: food });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error", error: error.message });
  }
};

// Update
exports.updateVegFood = async (req, res) => {
  try {
    const { name, rating, type, locationName } = req.body;
    const updateData = { name, rating, type, locationName };

    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, { folder: "vegFoods" });
      fs.unlinkSync(req.file.path);
      updateData.image = uploaded.secure_url;
    }

    const updated = await VegFood.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updated) return res.status(404).json({ status: false, message: "Veg food not found" });

    res.status(200).json({ status: true, message: "Veg food updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error", error: error.message });
  }
};

// Delete
exports.deleteVegFood = async (req, res) => {
  try {
    const deleted = await VegFood.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ status: false, message: "Veg food not found" });

    res.status(200).json({ status: true, message: "Veg food deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error", error: error.message });
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
// CREATE restaurant
// @desc    Create restaurant

exports.createRestaurant = async (req, res) => {
  try {
    const { restaurantName, description, locationName, location, rating, startingPrice } = req.body;

    if (!restaurantName || !location || !locationName || !startingPrice || !req.file) {
      return res.status(400).json({
        success: false,
        message: "restaurantName, locationName, location, startingPrice, and image are required"
      });
    }

    // ✅ Parse and validate location string
    let parsedLocation;
    try {
      parsedLocation = JSON.parse(location); // Expecting { latitude: 17.6656, longitude: 78.2358 }
      if (
        !parsedLocation.latitude || 
        !parsedLocation.longitude || 
        typeof parsedLocation.latitude !== "number" || 
        typeof parsedLocation.longitude !== "number"
      ) {
        return res.status(400).json({
          success: false,
          message: "Latitude and Longitude must be valid numbers"
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid location format. Must be JSON with latitude and longitude"
      });
    }

    // ✅ Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "restaurants",
      width: 1500,
      crop: "scale"
    });

    // ✅ Create restaurant with proper GeoJSON location
    const restaurant = await Restaurant.create({
      restaurantName,
      description,
      locationName,
      rating,
      startingPrice,
      location: {
        type: "Point",
        coordinates: [parsedLocation.longitude, parsedLocation.latitude]
      },
      image: {
        public_id: result.public_id,
        url: result.secure_url
      }
    });

    // ✅ Remove local image file after upload
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
// ✅ Get All Restaurants
exports.getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.status(200).json({ success: true, data: restaurants });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ✅ Get Restaurant by ID
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    res.status(200).json({ success: true, data: restaurant });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ✅ Update Restaurant
exports.updateRestaurant = async (req, res) => {
  try {
    const { restaurantName, description, locationName, location, rating, startingPrice } = req.body;

    let restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    // Parse and validate location
    let parsedLocation;
    if (location) {
      try {
        parsedLocation = JSON.parse(location);
        if (!parsedLocation.latitude || !parsedLocation.longitude) {
          return res.status(400).json({ success: false, message: "Latitude and Longitude are required" });
        }
      } catch (err) {
        return res.status(400).json({ success: false, message: "Invalid location format" });
      }
    }

    // Upload new image if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "restaurants",
        width: 1500,
        crop: "scale"
      });

      if (restaurant.image?.public_id) {
        await cloudinary.uploader.destroy(restaurant.image.public_id);
      }

      restaurant.image = {
        public_id: result.public_id,
        url: result.secure_url
      };

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    // Update fields
    if (restaurantName) restaurant.restaurantName = restaurantName;
    if (description) restaurant.description = description;
    if (locationName) restaurant.locationName = locationName;
    if (startingPrice) restaurant.startingPrice = startingPrice;
    if (rating) restaurant.rating = rating;
    if (parsedLocation) {
      restaurant.location = {
        type: "Point",
        coordinates: [parsedLocation.longitude, parsedLocation.latitude]
      };
    }

    await restaurant.save();

    res.status(200).json({ success: true, data: restaurant });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ✅ Delete Restaurant
exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });

    if (restaurant.image?.public_id) {
      await cloudinary.uploader.destroy(restaurant.image.public_id);
    }

    res.status(200).json({ success: true, message: "Restaurant deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


// @desc    Get top-rated restaurants near a user's location
// @route   GET /api/restaurants/top-rated-nearby/:userId
// @access  Public
// @query   [limit] Optional, number of restaurants to return (default: 5)

 exports.getTopRatedNearbyRestaurants = async (req, res) => {
  try {
    const { userId } = req.params;

    // Step 1: Find user by ID
    const user = await User.findById(userId);

    if (!user || !user.location || !Array.isArray(user.location.coordinates)) {
      return res.status(404).json({ success: false, message: 'User or location not found' });
    }

    const userCoordinates = user.location.coordinates;

    // Step 2: Find nearby restaurants within 5km with rating >= 4
    const nearbyRestaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: userCoordinates
          },
          $maxDistance: 5000 // meters = 5km
        }
      },
      rating: { $gte: 4 } // ✅ Fix applied here
    });

    res.status(200).json({
      success: true,
      message: 'Nearby top-rated restaurants found',
      count: nearbyRestaurants.length,
      data: nearbyRestaurants
    });
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};



//**
// * @desc    Get restaurants near a user's location
//* @route   GET /api/restaurants/nearby/:userId
// * @access  Public
// * @param   {string} userId - User ID to get location from
//* @param   {number} [distance=10] - Maximum distance in kilometers (optional)
//* @returns {Object} List of nearby restaurants with count

// Get nearby restaurants by user ID


exports.getNearbyRestaurants = async (req, res) => {
  try {
    const { userId } = req.params;

    // ✅ Step 1: Fetch user
    const user = await User.findById(userId);
    if (!user || !user.location || !Array.isArray(user.location.coordinates)) {
      return res.status(404).json({ success: false, message: 'User or location not found' });
    }

    const userCoordinates = user.location.coordinates;
    console.log("User coordinates:", userCoordinates);

    // ✅ Step 2: Fetch nearby restaurants within 5km
    const nearbyRestaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: userCoordinates
          },
          $maxDistance: 15000 // 5 km
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: nearbyRestaurants.length ? 'Nearby restaurants found' : 'No nearby restaurants found',
      data: nearbyRestaurants
    });
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};