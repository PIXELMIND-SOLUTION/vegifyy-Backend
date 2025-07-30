const RestaurantProduct = require("../models/restaurantProductModel");
const User = require("../models/userModel");
const Restaurant = require("../models/restaurantModel");
const cloudinary = require("../config/cloudinary");
const mongoose = require("mongoose");


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
      restaurantId: restaurant._id,
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
     

    return res.status(200).json({
      success: true,
      message: 'All restaurant products fetched successfully',
      data: products
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get all products for a specific restaurant
exports.getProductsByRestaurant = async (req, res) => {
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

exports.updateByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const updateData = req.body;
    const imageFiles = req.files?.['recommendedImages'];

    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        message: "Restaurant ID is required" 
      });
    }

    // Validate restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false, 
        message: "Restaurant not found" 
      });
    }

    // Find all products for this restaurant
    const products = await RestaurantProduct.find({ restaurantId: restaurant._id });
    if (!products.length) {
      return res.status(404).json({ 
        success: false, 
        message: "No products found for this restaurant" 
      });
    }

    // Process image uploads if provided
    let uploadedImages = [];
    if (imageFiles?.length) {
      uploadedImages = await Promise.all(
        imageFiles.map(async (file) => {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "product-images"
          });
          return { public_id: result.public_id, url: result.secure_url };
        })
      );
    }

    // Update each product
    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        // Handle recommended items update
        let updatedRecommended = product.recommended;
        if (updateData.recommended) {
          const recommendedArray = JSON.parse(updateData.recommended || '[]');
          updatedRecommended = recommendedArray.map((item, index) => ({
            ...item,
            image: uploadedImages[index] || item.image // keep existing if no new image
          }));
        }

        // Calculate distance/time if location changed
        let timeAndKm = product.timeAndKm;
        if (updateData.userId) {
          const user = await User.findById(updateData.userId);
          if (user?.location?.coordinates) {
            const distance = calculateDistance(
              user.location.coordinates,
              restaurant.location.coordinates
            );
            const time = (distance / 0.5).toFixed(1);
            timeAndKm = {
              time: `${time} mins`,
              distance: `${distance.toFixed(1)} km`
            };
          }
        }

        // Apply updates
        return await RestaurantProduct.findByIdAndUpdate(
          product._id,
          {
            restaurantName: updateData.restaurantName || product.restaurantName,
            locationName: updateData.locationName || product.locationName,
            type: updateData.type || product.type,
            rating: updateData.rating || product.rating,
            viewCount: updateData.viewCount || product.viewCount,
            recommended: updatedRecommended,
            timeAndKm,
            user: updateData.userId || product.user
          },
          { new: true }
        );
      })
    );

    return res.status(200).json({
      success: true,
      message: `Updated ${updatedProducts.length} products for restaurant ${restaurantId}`,
      data: updatedProducts
    });

  } catch (error) {
    console.error("❌ Error updating by restaurant:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};

/**
 * Update restaurant product by product ID
 * Similar to your existing update but with more detailed validation
 */
exports.updateByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;
    const imageFiles = req.files?.['recommendedImages'];

    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: "Product ID is required" 
      });
    }

    // Validate product exists
    const product = await RestaurantProduct.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    // Validate restaurant exists if provided
    let restaurant = product.restaurant;
    if (updateData.restaurantId) {
      restaurant = await Restaurant.findById(updateData.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ 
          success: false, 
          message: "Restaurant not found" 
        });
      }
    }

    // Validate user exists if provided
    let user = product.user;
    if (updateData.userId) {
      user = await User.findById(updateData.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
    }

    // Calculate distance/time if user or restaurant changed
    let timeAndKm = product.timeAndKm;
    if (updateData.userId || updateData.restaurantId) {
      const userCoords = user.location?.coordinates;
      const restaurantCoords = restaurant.location?.coordinates;

      if (!userCoords || !restaurantCoords) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing user or restaurant coordinates" 
        });
      }

      const distance = calculateDistance(userCoords, restaurantCoords);
      const time = (distance / 0.5).toFixed(1);
      timeAndKm = {
        time: `${time} mins`,
        distance: `${distance.toFixed(1)} km`
      };
    }

    // Process image uploads if provided
    let updatedRecommended = product.recommended;
    if (updateData.recommended && imageFiles?.length) {
      const recommendedArray = JSON.parse(updateData.recommended || '[]');
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
        image: uploadedImages[index] || item.image // keep existing if no new image
      }));
    }

    // Apply updates
    const updatedProduct = await RestaurantProduct.findByIdAndUpdate(
      productId,
      {
        restaurantName: updateData.restaurantName || product.restaurantName,
        locationName: updateData.locationName || product.locationName,
        type: updateData.type || product.type,
        rating: updateData.rating || product.rating,
        viewCount: updateData.viewCount || product.viewCount,
        recommended: updatedRecommended,
        timeAndKm,
        user: updateData.userId || product.user,
        restaurantId: updateData.restaurantId || product.restaurantId
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct
    });

  } catch (error) {
    console.error("❌ Error updating by product:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};

/**
 * Delete all products by restaurant ID
 */
exports.deleteByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ 
        success: false, 
        message: "Restaurant ID is required" 
      });
    }

    // Validate restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false, 
        message: "Restaurant not found" 
      });
    }

    // Find all products for this restaurant
    const products = await RestaurantProduct.find({ restaurantId: restaurant._id });
    if (!products.length) {
      return res.status(404).json({ 
        success: false, 
        message: "No products found for this restaurant" 
      });
    }

    // Delete all images from Cloudinary and products from DB
    await Promise.all(
      products.map(async (product) => {
        if (product.recommended?.length) {
          for (const item of product.recommended) {
            if (item.image?.public_id) {
              await cloudinary.uploader.destroy(item.image.public_id);
            }
          }
        }
        await RestaurantProduct.findByIdAndDelete(product._id);
      })
    );

    return res.status(200).json({
      success: true,
      message: `Deleted ${products.length} products for restaurant ${restaurantId}`
    });

  } catch (error) {
    console.error("❌ Error deleting by restaurant:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};

/**
 * Delete product by product ID
 * Similar to your existing delete but with more detailed response
 */
exports.deleteByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: "Product ID is required" 
      });
    }

    // Validate product exists
    const product = await RestaurantProduct.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    // Delete images from Cloudinary
    if (product.recommended?.length) {
      for (const item of product.recommended) {
        if (item.image?.public_id) {
          await cloudinary.uploader.destroy(item.image.public_id);
        }
      }
    }

    // Delete product from DB
    await RestaurantProduct.findByIdAndDelete(productId);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      deletedProduct: {
        id: product._id,
        name: product.restaurantName,
        location: product.locationName
      }
    });

  } catch (error) {
    console.error("❌ Error deleting by product:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};



//single resturant