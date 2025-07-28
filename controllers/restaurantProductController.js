const RestaurantProduct = require("../models/restaurantProductModel");
const User = require("../models/userModel");
const Restaurant = require("../models/restaurantModel");
const cloudinary = require("../config/cloudinary");


// Haversine formula to calculate distance in km
function calculateDistance(coord1, coord2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

exports.createRestaurantProduct = async (req, res) => {
  try {
    const {
      restaurantName,
      locationName,
      type,
      rating,
      viewCount,
      recommended,
      userId,
      restaurantId
    } = req.body;

    const recommendedArray = JSON.parse(recommended);
    const imageFiles = req.files['recommendedImages'];

    if (!restaurantName || !locationName || !type || !recommendedArray || !imageFiles || !userId || !restaurantId) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    // ✅ Fetch locations from DB
    const user = await User.findById(userId);
    const restaurant = await Restaurant.findById(restaurantId);

    if (!user || !restaurant) {
      return res.status(404).json({ success: false, message: "User or Restaurant not found" });
    }

    const userCoords = user.location?.coordinates;
    const restaurantCoords = restaurant.location?.coordinates;

    if (!userCoords || !restaurantCoords) {
      return res.status(400).json({ success: false, message: "Missing user or restaurant coordinates" });
    }

    // ✅ Calculate distance
    const distance = calculateDistance(userCoords, restaurantCoords);
    const time = (distance / 0.5).toFixed(1); // Assume 30km/h => 0.5 km/min

    // ✅ Upload Images
    const uploadedImages = await Promise.all(
      imageFiles.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "product-images"
        });
        return { public_id: result.public_id, url: result.secure_url };
      })
    );

    const finalRecommended = recommendedArray.map((item, index) => ({
      ...item,
      image: uploadedImages[index]
    }));

    const newProduct = await RestaurantProduct.create({
      restaurantName,
      locationName,
      type,
      rating,
      viewCount,
      recommended: finalRecommended,
      user: userId,
      restaurant: restaurantId,
      timeAndKm: {
        time: `${time} mins`,
        distance: `${distance.toFixed(1)} km`
      }
    });

    return res.status(201).json({
      success: true,
      message: "Restaurant Product Created Successfully",
      data: newProduct
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllRestaurantProducts = async (req, res) => {
  try {
    const products = await RestaurantProduct.find()
      .populate("user", "firstName lastName phoneNumber")
      .populate("restaurant", "restaurantName location");

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRestaurantProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await RestaurantProduct.findById(id)
      .populate("user", "firstName lastName phoneNumber")
      .populate("restaurant", "restaurantName location");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.updateRestaurantProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      restaurantName,
      locationName,
      type,
      rating,
      viewCount,
      recommended,
      userId,
      restaurantId
    } = req.body;

    const recommendedArray = recommended ? JSON.parse(recommended) : [];
    const imageFiles = req.files?.['recommendedImages'];

    const product = await RestaurantProduct.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Optional: Update images if provided
    let updatedRecommended = product.recommended;
    if (recommendedArray.length && imageFiles?.length === recommendedArray.length) {
      const uploadedImages = await Promise.all(
        imageFiles.map(async (file) => {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "product-images",
          });
          return { public_id: result.public_id, url: result.secure_url };
        })
      );

      updatedRecommended = recommendedArray.map((item, index) => ({
        ...item,
        image: uploadedImages[index],
      }));
    }

    // Update product fields
    product.restaurantName = restaurantName || product.restaurantName;
    product.locationName = locationName || product.locationName;
    product.type = type || product.type;
    product.rating = rating || product.rating;
    product.viewCount = viewCount || product.viewCount;
    product.recommended = updatedRecommended;
    product.user = userId || product.user;
    product.restaurant = restaurantId || product.restaurant;

    // Recalculate time & distance if coordinates updated
    if (userId || restaurantId) {
      const user = await User.findById(userId || product.user);
      const restaurant = await Restaurant.findById(restaurantId || product.restaurant);
      if (user && restaurant && user.location?.coordinates && restaurant.location?.coordinates) {
        const distance = calculateDistance(
          user.location.coordinates,
          restaurant.location.coordinates
        );
        const time = (distance / 0.5).toFixed(1);
        product.timeAndKm = {
          time: `${time} mins`,
          distance: `${distance.toFixed(1)} km`,
        };
      }
    }

    const updatedProduct = await product.save();
    return res.status(200).json({
      success: true,
      message: "Restaurant Product Updated Successfully",
      data: updatedProduct,
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteRestaurantProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await RestaurantProduct.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await RestaurantProduct.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Restaurant Product Deleted Successfully",
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
