const Category = require("../models/categoryModel");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

exports.createCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "Image is required" });

    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: "categories",
    });

    // Optional: Remove temp file
    fs.unlinkSync(file.path);

    const category = await Category.create({
      categoryName,
      imageUrl: uploadResult.secure_url,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
