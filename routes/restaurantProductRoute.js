const express = require("express");
const router = express.Router();
const controller = require('../controllers/restaurantProductController');
const uploads  = require("../utils/authMiddleware");
const upload =require('../utils/multer')


// Create product
router.post(
  '/restaurant-products',
   uploads,controller.createRestaurantProduct
);
router.get("/restaurant-products", controller.getAllRestaurantProducts);
router.get("/restaurant-products/:productId", controller.getAllRestaurantProducts);
router.get("/restaurant-product/:restaurantId", controller.getRestaurantProductById);
router.get("/restaurant-product/:categoryId", controller.getRestaurantProductsByCategoryId);

router.put("/restaurant-product/:id",uploads, controller.updateRestaurantProductById);


router.delete("/restaurant-product/:id", controller.deleteRestaurantProductById);


module.exports = router;