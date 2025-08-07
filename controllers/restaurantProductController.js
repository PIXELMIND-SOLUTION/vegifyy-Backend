const RestaurantProduct = require("../models/restaurantProductModel");
const User = require("../models/userModel");
const Restaurant = require("../models/restaurantModel");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");


// 🌍 Haversine formula
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
  const distance = R * c;
  const time = (distance / 30) * 60; // 30 km/h

  return {
    distance: `${distance.toFixed(2)} km`,
    time: `${Math.ceil(time)} mins`
  };
};

exports.createRestaurantProduct = async (req, res) => {
  try {
    const {
      restaurantId,
      userId,
      type,
      status,
      viewCount
    } = req.body;

    // ✅ Parse `recommended` data
    let recommended = [];
    if (typeof req.body.recommended === "string") {
      recommended = JSON.parse(req.body.recommended);
    } else if (Array.isArray(req.body.recommended)) {
      recommended = req.body.recommended;
    }

    const files = req.files?.recommendedImages || [];

    // ✅ Validate restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    // ✅ Validate user and location
    const user = await User.findById(userId);
    if (!user || !user.location?.coordinates) {
      return res.status(404).json({ success: false, message: "User or user location not found" });
    }

    // 📍 Calculate distance and time
    const { distance, time } = calculateDistance(
      user.location.coordinates,
      restaurant.location.coordinates
    );

    // 📸 Handle recommended item images
    const formattedRecommended = [];

    for (let i = 0; i < recommended.length; i++) {
      const item = recommended[i];
      let imageUrl = "";

      if (files[i]) {
        const upload = await cloudinary.uploader.upload(files[i].path, {
          folder: "restaurant-recommended"
        });
        imageUrl = upload.secure_url;
      }

      formattedRecommended.push({
        name: item.name,
        price: item.price,
        rating: item.rating || 0,
        viewCount: item.viewCount || 0,
        content: item.content || "",
        image: imageUrl,
        category: item.category || null
      });
    }

    // 🆕 Create product (do NOT store restaurantName here)
    const newProduct = new RestaurantProduct({
restaurantName: restaurant.restaurantName,
      locationName: restaurant.locationName,
      type: type || [],
      rating: restaurant.rating || 0,
      viewCount: viewCount || 0,
      recommended: formattedRecommended,
      user: userId,
      restaurantId, // ⬅️ Only the ref
      timeAndKm: { distance, time },
      status: status || "active"
    });

    const saved = await newProduct.save();

res.status(201).json({
  success: true,
  message: "Restaurant Product created successfully",
  data: saved
});
  } catch (error) {
    console.error("Create Restaurant Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};
// 📥 GET All Restaurant Products
exports.getAllRestaurantProducts = async (req, res) => {
  try {
    const products = await RestaurantProduct.find().populate("restaurantId user");

    res.status(200).json({
      success: true,
      message: "All restaurant products fetched successfully",
      data: products
    });
  } catch (error) {
    console.error("Get All Products Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// 📥 GET Product By ID (product inside recommended[])
exports.getRestaurantProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await RestaurantProduct.findById(id).populate("restaurantId user");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product
    });
  } catch (error) {
    console.error("Get Product By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

exports.getRestaurantProductsByCategoryId = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Step 1: Find all restaurant products where at least one recommended item matches the categoryId
    const restaurantProducts = await RestaurantProduct.find({
      "recommended.category": categoryId
    });

    // Step 2: Filter out only those recommended items that match categoryId
    const filteredProducts = restaurantProducts.map(product => {
      const filteredRecommended = product.recommended.filter(item =>
        item.category == categoryId
      );

      return {
        _id: product._id,
        restaurantName: product.restaurantName,
        locationName: product.locationName,
        type: product.type,
        rating: product.rating,
        viewCount: product.viewCount,
        timeAndKm: product.timeAndKm,
        status: product.status,
        restaurantId: product.restaurantId,
        user: product.user,
        recommended: filteredRecommended
      };
    }).filter(item => item.recommended.length > 0); // Exclude empty ones

    return res.status(200).json({
      success: true,
      message: "Restaurant products filtered by category",
      data: filteredProducts
    });

  } catch (error) {
    console.error("Error fetching by categoryId:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};
// 📥 GET Restaurant Product By ID
exports.updateRestaurantProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      restaurantId,
      userId,
      type,
      status,
      viewCount
    } = req.body;

    let restaurantProduct = await RestaurantProduct.findById(id);
    if (!restaurantProduct) {
      return res.status(404).json({ success: false, message: "Restaurant Product not found" });
    }

    // ✅ Parse `recommended`
    let recommended = [];
    if (typeof req.body.recommended === "string") {
      recommended = JSON.parse(req.body.recommended);
    } else if (Array.isArray(req.body.recommended)) {
      recommended = req.body.recommended;
    }

    const files = req.files?.recommendedImages || [];

    // 🏪 Validate restaurant
    const restaurant = await Restaurant.findById(restaurantId || restaurantProduct.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    // 👤 Validate user
    const user = await User.findById(userId || restaurantProduct.user);
    if (!user || !user.location?.coordinates) {
      return res.status(404).json({ success: false, message: "User or user location not found" });
    }

    // 📍 Calculate distance and time
    const { distance, time } = calculateDistance(
      user.location.coordinates,
      restaurant.location.coordinates
    );

    // 🖼️ Upload recommended images if provided
    const formattedRecommended = [];

    for (let i = 0; i < recommended.length; i++) {
      const item = recommended[i];
      let imageUrl = item.image || ""; // fallback to old image

      if (files[i]) {
        const upload = await cloudinary.uploader.upload(files[i].path, {
          folder: "restaurant-recommended"
        });
        imageUrl = upload.secure_url;
      }

      formattedRecommended.push({
        name: item.name,
        price: item.price,
        rating: item.rating || 0,
        viewCount: item.viewCount || 0,
        content: item.content || "",
        image: imageUrl,
        category: item.category || null
      });
    }

    // 🔁 Update fields
    restaurantProduct.restaurantName = restaurant.restaurantName;
    restaurantProduct.locationName = restaurant.locationName;
    restaurantProduct.type = type || restaurantProduct.type;
    restaurantProduct.rating = restaurant.rating || restaurantProduct.rating;
    restaurantProduct.viewCount = viewCount || restaurantProduct.viewCount;
    restaurantProduct.recommended = formattedRecommended;
    restaurantProduct.user = userId || restaurantProduct.user;
    restaurantProduct.restaurantId = restaurantId || restaurantProduct.restaurantId;
    restaurantProduct.timeAndKm = { distance, time };
    restaurantProduct.status = status || restaurantProduct.status;

    const updated = await restaurantProduct.save();

    res.status(200).json({
      success: true,
      message: "Restaurant Product updated successfully",
      data: updated
    });

  } catch (error) {
    console.error("Update Restaurant Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};


// 🗑️ DELETE Product By productId (inside recommended[])
exports.deleteRestaurantProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await RestaurantProduct.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Restaurant Product not found" });
    }

    res.status(200).json({
      success: true,
      message: "Restaurant Product deleted successfully"
    });
  } catch (error) {
    console.error("Delete Restaurant Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};


