const RestaurantProduct = require("../models/restaurantProductModel");
const User = require("../models/userModel");
const Restaurant = require("../models/restaurantModel");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");
const streamifier = require("streamifier");

// Upload buffer helper using streamifier and cloudinary upload_stream
function uploadBufferToCloudinary(buffer, folder = "") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

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
      viewCount,
      availableDate
    } = req.body;

    // Parse type
    let parsedType = [];
    if (typeof type === "string") {
      try {
        parsedType = JSON.parse(type);
      } catch {
        parsedType = type.split(",").map(s => s.trim());
      }
    } else if (Array.isArray(type)) {
      parsedType = type;
    }

    // Parse recommended
    let recommended = [];
    if (typeof req.body.recommended === "string") {
      recommended = JSON.parse(req.body.recommended);
    } else if (Array.isArray(req.body.recommended)) {
      recommended = req.body.recommended;
    }

    const recommendedFiles = req.files?.recommendedImages || [];

    // Validate restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user || !user.location?.coordinates) {
      return res.status(404).json({ success: false, message: "User or user location not found" });
    }

    // Distance calculation
    const { distance, time } = calculateDistance(
      user.location.coordinates,
      restaurant.location.coordinates
    );

    // Prepare recommended array
    const formattedRecommended = [];
    for (let i = 0; i < recommended.length; i++) {
      const item = recommended[i];
      let imageUrl = "";

      if (recommendedFiles[i]) {
        const upload = await uploadBufferToCloudinary(recommendedFiles[i].buffer, "restaurant-recommended");
        imageUrl = upload.secure_url;
      }

      // Parse addons
      let parsedAddons = {};
      if (item.addons) {
        const parsed = typeof item.addons === "string" ? JSON.parse(item.addons) : item.addons;
        const vendorHalfPercentage = Number(item.vendorHalfPercentage) || 0;
        const vendor_Platecost = Number(item.vendor_Platecost) || 0;
        const productPrice = Number(item.price) || 0;
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
          productName: parsed.productName || "",
          variation: {
            name: parsed.variation?.name || "",
            type: parsed.variation?.type || "",
            price: variationPrice,
          },
          plates: {
            name: parsed.plates?.name || "",
            item: plateItemCount,
            platePrice: vendor_Platecost,
            totalPlatesPrice: totalPlatesPrice,
          }
        };
      }

      formattedRecommended.push({
        name: item.name,
        price: item.price,
        rating: item.rating || 0,
        viewCount: item.viewCount || 0,
        content: item.content || "",
        image: imageUrl,
        addons: parsedAddons,
        category: item.category || null
      });
    }

    // Save product
    const newProduct = new RestaurantProduct({
      restaurantName: restaurant.restaurantName,
      locationName: restaurant.locationName,
      type: parsedType,
      rating: restaurant.rating || 0,
      viewCount: viewCount || 0,
      recommended: formattedRecommended,
      user: userId,
      restaurantId,
      timeAndKm: { distance, time },
      availableDate: availableDate ? new Date(availableDate) : null,
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
// Get all restaurant products
exports.getAllRestaurantProducts = async (req, res) => {
  try {
    const products = await RestaurantProduct.find();
    res.status(200).json({
      success: true,
      message: "All restaurant products fetched ✅",
      data: products,
    });
  } catch (error) {
    console.error("Get All Restaurant Products Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get a restaurant product by its ID
exports.getRestaurantProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ success: false, message: "Invalid product ID" });

    const product = await RestaurantProduct.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({
      success: true,
      message: "Product fetched ✅",
      data: product,
    });
  } catch (error) {
    console.error("Get Restaurant Product By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get restaurant products by category ID
exports.getRestaurantProductsByCategoryId = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId))
      return res.status(400).json({ success: false, message: "Invalid category ID" });

    const products = await RestaurantProduct.find({
      "recommended.category": mongoose.Types.ObjectId(categoryId),
    });

    res.status(200).json({
      success: true,
      message: `Products in category ${categoryId} fetched ✅`,
      data: products,
    });
  } catch (error) {
    console.error("Get Restaurant Products By Category ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
exports.updateRestaurantProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      restaurantId,
      userId,
      type,
      status,
      viewCount,
      availableDate
    } = req.body;

    // Find existing product
    const product = await RestaurantProduct.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Validate restaurant if restaurantId provided and changed
    if (restaurantId && restaurantId !== product.restaurantId.toString()) {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }
      product.restaurantId = restaurantId;
      product.restaurantName = restaurant.restaurantName;
      product.locationName = restaurant.locationName;
      product.rating = restaurant.rating || 0;
    }

    // Validate user if userId provided and changed
    if (userId && userId !== product.user.toString()) {
      const user = await User.findById(userId);
      if (!user || !user.location?.coordinates) {
        return res.status(404).json({ success: false, message: "User or user location not found" });
      }
      product.user = userId;

      // Recalculate distance and time if restaurantId also set
      if (restaurantId) {
        const restaurant = await Restaurant.findById(restaurantId);
        const { distance, time } = calculateDistance(
          user.location.coordinates,
          restaurant.location.coordinates
        );
        product.timeAndKm = { distance, time };
      }
    }

    // Parse type
    let parsedType = product.type;
    if (type !== undefined) {
      if (typeof type === "string") {
        try {
          parsedType = JSON.parse(type);
        } catch {
          parsedType = type.split(",").map(s => s.trim());
        }
      } else if (Array.isArray(type)) {
        parsedType = type;
      }
      product.type = parsedType;
    }

    // Parse recommended
    let recommended = [];
    if (req.body.recommended !== undefined) {
      if (typeof req.body.recommended === "string") {
        recommended = JSON.parse(req.body.recommended);
      } else if (Array.isArray(req.body.recommended)) {
        recommended = req.body.recommended;
      }
    } else {
      recommended = product.recommended || [];
    }

    const recommendedFiles = req.files?.recommendedImages || [];

    // Prepare recommended array
    const formattedRecommended = [];
    for (let i = 0; i < recommended.length; i++) {
      const item = recommended[i];
      let imageUrl = item.image || "";

      if (recommendedFiles[i]) {
        const upload = await uploadBufferToCloudinary(recommendedFiles[i].buffer, "restaurant-recommended");
        imageUrl = upload.secure_url;
      }

      // Parse addons
      let parsedAddons = {};
      if (item.addons) {
        const parsed = typeof item.addons === "string" ? JSON.parse(item.addons) : item.addons;
        const vendorHalfPercentage = Number(item.vendorHalfPercentage) || 0;
        const vendor_Platecost = Number(item.vendor_Platecost) || 0;
        const productPrice = Number(item.price) || 0;
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
          productName: parsed.productName || "",
          variation: {
            name: parsed.variation?.name || "",
            type: parsed.variation?.type || "",
            price: variationPrice,
          },
          plates: {
            name: parsed.plates?.name || "",
            item: plateItemCount,
            platePrice: vendor_Platecost,
            totalPlatesPrice: totalPlatesPrice,
          }
        };
      }

      formattedRecommended.push({
        name: item.name,
        price: item.price,
        rating: item.rating || 0,
        viewCount: item.viewCount || 0,
        content: item.content || "",
        image: imageUrl,
        addons: parsedAddons,
        category: item.category || null
      });
    }

    product.recommended = formattedRecommended;

    // Update other simple fields if provided
    if (viewCount !== undefined) product.viewCount = viewCount;
    if (availableDate !== undefined) product.availableDate = availableDate ? new Date(availableDate) : null;
    if (status !== undefined) product.status = status;

    // Save updated product
    const saved = await product.save();

    res.status(200).json({
      success: true,
      message: "Restaurant Product updated successfully",
      data: saved
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


// Delete restaurant product by ID
exports.deleteRestaurantProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ success: false, message: "Invalid product ID" });

    const deletedProduct = await RestaurantProduct.findByIdAndDelete(productId);
    if (!deletedProduct)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({
      success: true,
      message: "Product deleted successfully ✅",
    });
  } catch (error) {
    console.error("Delete Restaurant Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};