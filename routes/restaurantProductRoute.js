const express = require("express");
const router = express.Router();
const controller = require('../controllers/restaurantProductController');
const multiUpload = require('../utils/multer2');  // your multer middleware

router.post('/restaurant-products', multiUpload, controller.createRestaurantProduct);
router.get("/restaurant-products", controller.getAllRestaurantProducts);
router.get("/restaurant-products/:productId", controller.getAllRestaurantProducts);
router.get("/restaurant-product/:restaurantId", controller.getRestaurantProductById);
router.get("/restaurant-product/:categoryId", controller.getRestaurantProductsByCategoryId);
router.put("/restaurant-product/:id", multiUpload, controller.updateRestaurantProductById);
router.delete("/restaurant-product/:id", controller.deleteRestaurantProductById);

module.exports = router;
