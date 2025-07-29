const express = require("express");
const router = express.Router();
const controller = require("../controllers/restaurantProductController");
const uploads= require("../utils/m2");

// Create product
router.post(
  '/restaurant-products',
  uploads.fields([{ name: 'recommendedImages', maxCount: 30 }]),
  controller.createRestaurantProduct
);

// Get all products
router.get("/restaurant-products", controller.getAllRestaurantProducts);

// Get products by restaurant
router.get("/restaurant-products/:restaurantId", controller.getProductsByRestaurant);

// Update product by ID
router.put(
  '/restaurant-products/:productId',
  uploads.fields([{ name: 'recommendedImages', maxCount: 30 }]),
  controller.updateByProduct
);

// Delete product by ID
router.delete('/restaurant-products/:productId', controller.deleteByProduct);

// Bulk update by restaurant ID
router.put(
  '/restaurants/:restaurantId/products',
  uploads.fields([{ name: 'recommendedImages', maxCount: 30 }]),
  controller.updateByRestaurant
);

// Bulk delete by restaurant ID
router.delete('/restaurants/:restaurantId/products', controller.deleteByRestaurant);

module.exports = router;