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
  return R * c;
};

// ⏱️ Time Estimate
const estimateTime = (distanceKm) => {
  const speed = 30;
  return `${Math.ceil((distanceKm / speed) * 60)} mins`;
};

exports.createRestaurantProduct = async (req, res) => {
  try {
    const {
      restaurantName,
      locationName,
      type,
      rating,
      viewCount,
      recommended,
      addons,
      user,
      restaurantId,
      productPrice,
      vendorHalfPercentage,
      vendor_Platecost,
      status,
    } = req.body;

    const recommendedItems = JSON.parse(recommended || "[]");
    const addonsData = JSON.parse(addons || "{}");
    const typeArray = JSON.parse(type || "[]");

    const foundUser = await User.findById(user);
    const foundRestaurant = await Restaurant.findById(restaurantId);

    if (!foundUser || !foundRestaurant) {
      return res.status(404).json({
        success: false,
        message: "User or Restaurant not found",
      });
    }

    // 📍 Distance & time
    const userCoords = foundUser.location.coordinates;
    const restaurantCoords = foundRestaurant.location.coordinates;

    const distanceKm = calculateDistance(userCoords, restaurantCoords);
    const timeToReach = estimateTime(distanceKm);

    // 📷 Upload recommended images
    const recommendedImages = req.files?.recommendedImages || [];

    for (let i = 0; i < recommendedItems.length; i++) {
      if (recommendedImages[i]) {
        const upload = await cloudinary.uploader.upload(recommendedImages[i].path, {
          folder: "recommendedImages",
        });
        recommendedItems[i].image = upload.secure_url;
      }
    }

    // 📷 Upload addon image
    if (req.files?.addonImage?.[0]) {
      const upload = await cloudinary.uploader.upload(req.files.addonImage[0].path, {
        folder: "addonImage",
      });
      addonsData.addonImage = {
        public_id: upload.public_id,
        url: upload.secure_url,
      };
    }

    // 💸 Variation price calculation
    if (addonsData.variation?.type === "Half") {
      const percent = Number(vendorHalfPercentage || 0);
      const price = Number(productPrice || 0);
      const halfPrice = price - (price * percent) / 100;

      addonsData.variation.price = Math.round(halfPrice);
    } else if (addonsData.variation?.type === "Full") {
      addonsData.variation.price = Number(productPrice || 0);
    }

    // 🍽️ Plate price calculation from vendor_Platecost
    if (addonsData.plates?.item && vendor_Platecost) {
      addonsData.plates.platePrice = Number(vendor_Platecost);
      addonsData.plates.totalPlatesPrice =
        Number(vendor_Platecost) * Number(addonsData.plates.item);
    }

    // ⭐ Rating/Review count defaults
    const avgRating =
      recommendedItems.reduce((acc, item) => acc + (item.rating || 0), 0) /
        (recommendedItems.length || 1) || 0;
    const totalViews = recommendedItems.reduce((acc, item) => acc + (item.viewCount || 0), 0);

    // 🔐 Final object excluding vendor fields
    const productData = {
      restaurantName,
      locationName,
      type: typeArray,
      rating: Number(rating || avgRating.toFixed(1)),
      viewCount: Number(viewCount || totalViews),
      recommended: recommendedItems,
      addons: addonsData,
      user,
      restaurantId,
      productPrice,
      timeAndKm: {
        distance: `${distanceKm.toFixed(2)} km`,
        time: timeToReach,
      },
      status,
    };

    const newProduct = await RestaurantProduct.create({
      ...productData,
      vendorHalfPercentage,
      vendor_Platecost,
    });

    // Remove sensitive fields before sending response
    const productObject = newProduct.toObject();
    delete productObject.vendorHalfPercentage;
    delete productObject.vendor_Platecost;

    res.status(201).json({
      success: true,
      message: "Restaurant product created successfully",
      data: productObject,
    });
  } catch (err) {
    console.error("❌ Product Creation Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};


// 📥 GET All Restaurant Products
exports.getAllRestaurantProducts = async (req, res) => {
  try {
    const products = await RestaurantProduct.find().lean();
    products.forEach((p) => {
      delete p.vendorHalfPercentage;
      delete p.vendor_Platecost;
    });
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// 📥 GET Product By ID (product inside recommended[])
exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await RestaurantProduct.findOne({
      "recommended._id": productId,
    }).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const recommendedProduct = product.recommended.find(
      (item) => item._id.toString() === productId
    );
    res.status(200).json({ success: true, data: recommendedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// 📥 GET Restaurant Product By ID
exports.getRestaurantProductsByRestaurantId = async (req, res) => {
     try {
    const restaurantId = req.params.restaurantId;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid restaurant ID format" 
      });
    }

    const products = await RestaurantProduct.find({ restaurantId })
    
    if (!products || products.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No products found for this restaurant" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Restaurant products fetched successfully",
      data: products
    });
  } catch (error) {
    console.error("❌ Error fetching restaurant products:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};
// ✏️ UPDATE Restaurant Product By ID
exports.updateRestaurantProductById = async (req, res) => {
   try {
    const { restaurantId } = req.params;
    const {
      restaurantName,
      locationName,
      type,
      rating,
      viewCount,
      recommended,
      addons,
      user,
      productPrice,
      vendorHalfPercentage,
      vendor_Platecost,
      status,
    } = req.body;

    const product = await RestaurantProduct.findOne({ restaurantId });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Restaurant product not found with given restaurantId",
      });
    }

    const recommendedItems = JSON.parse(recommended || "[]");
    const addonsData = JSON.parse(addons || "{}");
    const typeArray = JSON.parse(type || "[]");

    const foundUser = await User.findById(user);
    const foundRestaurant = await Restaurant.findById(restaurantId);

    if (!foundUser || !foundRestaurant) {
      return res.status(404).json({
        success: false,
        message: "User or Restaurant not found",
      });
    }

    // 🌍 Recalculate distance/time
    const userCoords = foundUser.location.coordinates;
    const restaurantCoords = foundRestaurant.location.coordinates;
    const distanceKm = calculateDistance(userCoords, restaurantCoords);
    const timeToReach = estimateTime(distanceKm);

    // 📷 Upload recommended images if available
    const recommendedImages = req.files?.recommendedImages || [];
    for (let i = 0; i < recommendedItems.length; i++) {
      if (recommendedImages[i]) {
        const upload = await cloudinary.uploader.upload(recommendedImages[i].path, {
          folder: "recommendedImages",
        });
        recommendedItems[i].image = upload.secure_url;
      }
    }

    // 📷 Upload addon image if available
    if (req.files?.addonImage?.[0]) {
      const upload = await cloudinary.uploader.upload(req.files.addonImage[0].path, {
        folder: "addonImage",
      });
      addonsData.addonImage = {
        public_id: upload.public_id,
        url: upload.secure_url,
      };
    }

    // 💸 Update variation price logic
    if (addonsData.variation?.type === "Half") {
      const percent = Number(vendorHalfPercentage || 0);
      const price = Number(productPrice || 0);
      const halfPrice = price - (price * percent) / 100;
      addonsData.variation.price = Math.round(halfPrice);
    } else if (addonsData.variation?.type === "Full") {
      addonsData.variation.price = Number(productPrice || 0);
    }

    // 🍽️ Plate price update
    if (addonsData.plates?.item && vendor_Platecost) {
      addonsData.plates.platePrice = Number(vendor_Platecost);
      addonsData.plates.totalPlatesPrice =
        Number(vendor_Platecost) * Number(addonsData.plates.item);
    }

    // ⭐ Updated rating & views
    const avgRating =
      recommendedItems.reduce((acc, item) => acc + (item.rating || 0), 0) / (recommendedItems.length || 1) || 0;
    const totalViews = recommendedItems.reduce((acc, item) => acc + (item.viewCount || 0), 0);

    // 🔁 Update the fields
    product.restaurantName = restaurantName || product.restaurantName;
    product.locationName = locationName || product.locationName;
    product.type = typeArray.length ? typeArray : product.type;
    product.rating = Number(rating || avgRating.toFixed(1));
    product.viewCount = Number(viewCount || totalViews);
    product.recommended = recommendedItems;
    product.addons = addonsData;
    product.user = user || product.user;
    product.productPrice = productPrice || product.productPrice;
    product.timeAndKm = {
      distance: `${distanceKm.toFixed(2)} km`,
      time: timeToReach,
    };
    product.status = status || product.status;

    // Keep vendor fields internally, don't expose them in response
    product.vendorHalfPercentage = vendorHalfPercentage || product.vendorHalfPercentage;
    product.vendor_Platecost = vendor_Platecost || product.vendor_Platecost;

    await product.save();

    const productObject = product.toObject();
    delete productObject.vendorHalfPercentage;
    delete productObject.vendor_Platecost;

    res.status(200).json({
      success: true,
      message: "Restaurant product updated successfully",
      data: productObject,
    });
  } catch (err) {
    console.error("❌ Product Update Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during product update",
      error: err.message,
    });
  }
};
// 🗑️ DELETE Product By productId (inside recommended[])
exports.deleteProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await RestaurantProduct.findOne({
      "recommended._id": productId,
    });

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    product.recommended = product.recommended.filter(
      (item) => item._id.toString() !== productId
    );

    await product.save();
    res.status(200).json({ success: true, message: "Recommended product deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// 🗑️ DELETE Restaurant Product By ID
exports.deleteRestaurantProductById = async (req, res) => {
    try {
    const { restaurantId } = req.params;

    const deletedProducts = await RestaurantProduct.deleteMany({ restaurantId });

    if (deletedProducts.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for the given restaurant ID",
      });
    }

    res.status(200).json({
      success: true,
      message: `Deleted ${deletedProducts.deletedCount} products for the given restaurant ID`,
    });
  } catch (err) {
    console.error("❌ Delete by Restaurant ID Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};