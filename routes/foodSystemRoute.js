const express = require("express");
const router = express.Router();
const controller = require("../controllers/foodSystemController");
const upload = require("../utils/uploadMiddleware");

router.post("/category", upload.single("image"), controller.createCategory);
router.get("/category", controller.getAllCategories);


router.post('/veg-food', upload.single('image'), controller.createVegFood);
router.get('/veg-foods', controller.getAllVegFoods);
router.get('/veg-food/:id', controller.getVegFoodById);
router.put('/veg-food/:id', upload.single('image'), controller.updateVegFood);
router.delete('/veg-food/:id', controller.deleteVegFood);

router.post("/cart", controller.addToCart);
router.get("/cart/:userId", controller.getCart);
router.put("/cart/:userId/:productId", controller.updateCartItem);
router.delete("/cart/:userId/:productId", controller.removeFromCart);

// Public routes
// @route   POST /api/restaurants

// POST /api/restaurants - Create new restaurant
router.post('/restaurant', upload.single('image'),controller.createRestaurant);

// GET /api/restaurants - Get all restaurants
router.get('/restaurant', controller.getAllRestaurants);

// GET /api/restaurants/:id - Get single restaurant
router.get('/restaurant/:id', controller.getRestaurantById);

// PUT /api/restaurants/:id - Update restaurant (Admin only)
router.put('/restaurant/:id',upload.single('image'), controller.updateRestaurant);

// DELETE /api/restaurants/:id - Delete restaurant (Admin only)
router.delete('/restaurant/:id',controller.deleteRestaurant);

router.get('/top-nearby/:userId', controller.getTopRatedNearbyRestaurants); // ✅ Top-rated route

// GET /api/restaurants/nearby/:userId - Get nearby restaurants
router.get('/nearby/:userId', controller.getNearbyRestaurants);


module.exports = router;
