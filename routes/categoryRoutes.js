const express = require("express");
const router = express.Router();
const upload = require("../utils/uploadMiddleware");
const categoryController = require("../controllers/categoryController");

router.post("/category", upload.single("image"), categoryController.createCategory);
router.get("/category", categoryController.getAllCategories);

module.exports = router;
