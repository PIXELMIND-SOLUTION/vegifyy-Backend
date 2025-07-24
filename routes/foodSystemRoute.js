const express = require("express");
const router = express.Router();
const controller = require("../controllers/foodSystemController");
const upload = require("../utils/uploadMiddleware");
const { protect, admin } = require('../utils/authMiddleware');

router.post("/category", upload.single("image"), controller.createCategory);
router.get("/category", controller.getAllCategories);

router.post("/veg-food", upload.single("image"), controller.createVegFood); // ✅ Fixed
router.get("/veg-food", controller.getAllVegFoods);                         // ✅ Fixed

router.post("/cart", controller.addToCart);
router.get("/cart/:userId", controller.getCart);
router.put("/cart/:userId/:productId", controller.updateCartItem);
router.delete("/cart/:userId/:productId", controller.removeFromCart);

// Public routes
// @route   POST /api/restaurants

// POST /api/restaurants - Create new restaurant
router.post('/restaurant', upload.single('image'),controller.createRestaurant);

// GET /api/restaurants - Get all restaurants
router.get('/restaurant', controller.getRestaurants);

// GET /api/restaurants/:id - Get single restaurant
router.get('/restaurant/:id', controller.getRestaurant);

// PUT /api/restaurants/:id - Update restaurant (Admin only)
router.put('/restaurant/:id',upload.single('image'), controller.updateRestaurant);

// DELETE /api/restaurants/:id - Delete restaurant (Admin only)
router.delete('/restaurant/:id',controller.deleteRestaurant);

router.get('/top', controller.getTopRatedRestaurants); // ✅ Top-rated route

// GET /api/restaurants/nearby/:userId - Get nearby restaurants
router.get('/nearby/:userId', controller.getNearbyRestaurants);


module.exports = router;
