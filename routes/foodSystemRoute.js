const express = require("express");
const router = express.Router();
const controller = require("../controllers/foodSystemController");
const upload = require("../utils/uploadMiddleware");

router.post("/category", upload.single("image"), controller.createCategory);
router.get("/category", controller.getAllCategories);

router.post("/veg-food", upload.single("image"), controller.createVegFood); // ✅ Fixed
router.get("/veg-food", controller.getAllVegFoods);                         // ✅ Fixed

router.post("/cart", controller.addToCart);
router.get("/cart/:userId", controller.getCart);
router.put("/cart/:userId/:productId", controller.updateCartItem);
router.delete("/cart/:userId/:productId", controller.removeFromCart);

module.exports = router;
