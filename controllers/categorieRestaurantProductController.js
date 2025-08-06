const CategorieRestaurantProduct = require("../models/categorieRestaurantModel");
const Restaurant = require("../models/restaurantModel");
const { Category } = require("../models/foodSystemModel");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// ➕ CREATE
exports.createCategorieRestaurantProduct = async (req, res) => {
  try {
    const { restaurant, rating, content, categorie } = req.body;

    if (!restaurant || !categorie) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    // 📌 Find the restaurant
    const restaurantDoc = await Restaurant.findById(restaurant);
    if (!restaurantDoc) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // ⬇️ Extract locationName from the restaurant document
    const locationName = restaurantDoc.locationName || [];

    let imageUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }

    // 🔥 Create the product
    const newProduct = await CategorieRestaurantProduct.create({
      restaurant,
      categorie,
      rating,
      content,
      locationName,
      image: imageUrl,
    });

    // 🔁 Populate restaurant and categorie names
    const populatedProduct = await CategorieRestaurantProduct.findById(newProduct._id)
      .populate('restaurant', 'restaurantName locationName') // ✅ Include locationName here too
      .populate('categorie', 'categoryName');

    res.status(201).json({ success: true, data: populatedProduct });
  } catch (err) {
    console.error("Error creating:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
// 📥 GET ALL
exports.getAllCategorieRestaurantProducts = async (req, res) => {
  try {
    const products = await CategorieRestaurantProduct.find()
      .populate('restaurant', 'restaurantName locationName')
      .populate('categorie', 'categoryName');

    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📥 GET BY ID
exports.getCategorieRestaurantProductById = async (req, res) => {
  try {
    const product = await CategorieRestaurantProduct.findById(req.params.id)
      .populate('restaurant', 'restaurantName locationName')
      .populate('categorie', 'categoryName');

    if (!product) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✏️ UPDATE
exports.updateCategorieRestaurantProduct = async (req, res) => {
  try {
    const { restaurant, rating, content, categorie } = req.body;

    const product = await CategorieRestaurantProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // Optional: Fetch new locationName if restaurant is changed
    let locationName = product.locationName;
    if (restaurant && restaurant !== product.restaurant.toString()) {
      const restaurantDoc = await Restaurant.findById(restaurant);
      if (!restaurantDoc) return res.status(404).json({ success: false, message: "Restaurant not found" });
      locationName = restaurantDoc.locationName || [];
    }

    // Handle image update
    let imageUrl = product.image;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }

    product.restaurant = restaurant || product.restaurant;
    product.rating = rating ?? product.rating;
    product.content = content || product.content;
    product.categorie = categorie || product.categorie;
    product.locationName = locationName;
    product.image = imageUrl;

    await product.save();

    const updated = await CategorieRestaurantProduct.findById(product._id)
      .populate('restaurant', 'restaurantName locationName')
      .populate('categorie', 'categoryName');

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ❌ DELETE
exports.deleteCategorieRestaurantProduct = async (req, res) => {
  try {
    const product = await CategorieRestaurantProduct.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📦 GET BY CATEGORIE ID
exports.getByCategorieId = async (req, res) => {
  try {
    const { categorieId } = req.params;

    const products = await CategorieRestaurantProduct.find({ categorie: categorieId })
      .populate('restaurant', 'restaurantName locationName')
      .populate('categorie', 'categoryName');

    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};