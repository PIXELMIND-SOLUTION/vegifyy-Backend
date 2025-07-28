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

    const recommendedArray = JSON.parse(recommended || '[]');
    const imageFiles = req.files?.['recommendedImages'];

    // Validate required fields
    if (
      !restaurantName || !locationName || !type || !recommendedArray.length ||
      !imageFiles || !userId || !restaurantId
    ) {
      return res.status(400).json({ success: false, message: "Required fields missing or invalid" });
    }

    // Get user and restaurant from DB
    const user = await User.findById(userId);
    const restaurant = await Restaurant.findById(restaurantId);

    if (!user || !restaurant) {
      return res.status(404).json({ success: false, message: "User or Restaurant not found" });
    }

    const userCoords = user.location?.coordinates;
    const restaurantCoords = restaurant.location?.coordinates;

    if (!userCoords || !restaurantCoords) {
      return res.status(400).json({ success: false, message: "User or Restaurant location missing" });
    }

    // Calculate distance & estimated time
    const distance = calculateDistance(userCoords, restaurantCoords);
    const time = (distance / 0.5).toFixed(1); // Assuming 30km/hr => 0.5 km/min

    // Upload recommended images
    const uploadedImages = await Promise.all(
      imageFiles.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "product-images"
        });
        return { public_id: result.public_id, url: result.secure_url };
      })
    );

    // Attach images to recommended items
    const finalRecommended = recommendedArray.map((item, index) => ({
      ...item,
      image: uploadedImages[index]
    }));

    // Save to DB
    const newProduct = await RestaurantProduct.create({
      restaurantName,
      locationName,
      type: Array.isArray(type) ? type : [type],
      rating,
      viewCount,
      recommended: finalRecommended,
      user: user._id,
      restaurant: restaurant._id,
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
    console.error("❌ Error creating restaurant product:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

exports.getAllRestaurantProducts = async (req, res) => {
  try {
    const products = await RestaurantProduct.find()
      .populate('user', 'firstName lastName email')
      .populate('restaurant', 'restaurantName location')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'All restaurant products fetched successfully',
      data: products
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getRestaurantProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await RestaurantProduct.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('restaurant', 'restaurantName location');

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({
      success: true,
      message: 'Restaurant product fetched successfully',
      data: product
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRestaurantProduct = async (req, res) => {
  try {
    const { productId } = req.params;
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

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const existingProduct = await RestaurantProduct.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

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

    const distance = calculateDistance(userCoords, restaurantCoords);
    const time = (distance / 0.5).toFixed(1);

    let updatedRecommended = [];

    const recommendedArray = recommended ? JSON.parse(recommended) : [];
    const imageFiles = req.files?.["recommendedImages"];

    if (recommendedArray.length && imageFiles?.length) {
      const uploadedImages = await Promise.all(
        imageFiles.map(async (file) => {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "product-images"
          });
          return { public_id: result.public_id, url: result.secure_url };
        })
      );

      updatedRecommended = recommendedArray.map((item, index) => ({
        ...item,
        image: uploadedImages[index]
      }));
    } else {
      updatedRecommended = existingProduct.recommended; // keep existing if not updating
    }

    // Update product
    existingProduct.restaurantName = restaurantName || existingProduct.restaurantName;
    existingProduct.locationName = locationName || existingProduct.locationName;
    existingProduct.type = type || existingProduct.type;
    existingProduct.rating = rating || existingProduct.rating;
    existingProduct.viewCount = viewCount || existingProduct.viewCount;
    existingProduct.recommended = updatedRecommended;
    existingProduct.user = userId || existingProduct.user;
    existingProduct.restaurant = restaurantId || existingProduct.restaurant;
    existingProduct.timeAndKm = {
      time: `${time} mins`,
      distance: `${distance.toFixed(1)} km`
    };

    await existingProduct.save();

    return res.status(200).json({
      success: true,
      message: "Restaurant Product updated successfully",
      data: existingProduct
    });

  } catch (error) {
    console.error("❌ Update error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


exports.deleteRestaurantProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const product = await RestaurantProduct.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Optionally delete Cloudinary images
    if (product.recommended?.length) {
      for (const item of product.recommended) {
        if (item.image?.public_id) {
          await cloudinary.uploader.destroy(item.image.public_id);
        }
      }
    }

    await RestaurantProduct.findByIdAndDelete(productId);

    return res.status(200).json({
      success: true,
      message: "Restaurant Product deleted successfully"
    });

  } catch (error) {
    console.error("❌ Delete error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

