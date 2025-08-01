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
router.get("/restaurant-products/:productId", controller.getProductById);
router.get("/restaurant-product/:restaurantId", controller.getRestaurantProductsByRestaurantId);

router.put("/restaurant-product/:restaurantId",uploads, controller.updateRestaurantProductById);


router.delete("/restaurant-product/:productId", controller.deleteProductById);
router.delete("/restaurant-products/:restaurantId", controller.deleteRestaurantProductById);


module.exports = router;