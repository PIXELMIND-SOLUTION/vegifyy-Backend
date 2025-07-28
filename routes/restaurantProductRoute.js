const express = require("express");
const router = express.Router();
const controller = require("../controllers/restaurantProductController");
const upload= require("../utils/multer");

// ✅ Use array instead of fields

router.post(
  '/restaurant-product',
  upload.fields([{ name: 'recommendedImages', maxCount: 40}]),
  controller.createRestaurantProduct
);
router.get("/restaurant-products", controller.getAllRestaurantProducts);
router.get("/restaurant-products/:id", controller.getRestaurantProductById);
router.put(
  "/restaurant-product/:productId",
  upload.fields([{ name: 'recommendedImages', maxCount: 40 }]),
  controller.updateRestaurantProduct
);

router.delete("/restaurant-products/:id", controller.deleteRestaurantProduct);


module.exports = router;
