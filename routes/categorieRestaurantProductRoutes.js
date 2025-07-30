const express = require("express");
const router = express.Router();
const upload = require('../utils/multer');
const controller = require("../controllers/categorieRestaurantProductController");

router.post("/categorieProduct", upload.single("image"), controller.createCategorieProduct);
router.get("/categorieProducts", controller.getAllCategorieProducts);
router.get("/categorieProduct/:id", controller.getCategorieProductById);
router.put("/categorieProduct/:id", upload.single("image"), controller.updateCategorieProduct);
router.delete("/categorieProduct/:id", controller.deleteCategorieProduct);
router.get("/bycategorie/:categorieId", controller.getCategorieProductsByCategorieId);

module.exports = router;
