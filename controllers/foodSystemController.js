const { Category, VegFood } = require("../models/foodSystemModel");
const Cart=require("../models/cartModel");
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
    const { restaurantName, rating, description, latitude, longitude } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "restaurants"
    });

    fs.unlinkSync(req.file.path); // remove local file

    const newRest = await Restaurant.create({
      restaurantName,
      rating,
      description,
      location: { latitude, longitude },
      image: result.secure_url,
    });

    res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      data: newRest,
    });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.getAllRestaurants = async (req, res) => {
  try {
    const data = await Restaurant.find();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};