const CategorieRestaurantProduct = require("../models/categorieRestaurantModel");
const cloudinary = require("../config/cloudinary");

// ✅ Create Product
exports.createCategorieProduct = async (req, res) => {
  try {
    let imageUrl = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }

    const { name, rating, content, locationName, categorie } = req.body;

    const newProduct = new CategorieRestaurantProduct({
      name,
      image: imageUrl,
      rating,
      content,
      locationName: locationName ? locationName.split(",") : [],
      categorie,
    });

    await newProduct.save();
    res.status(201).json({ success: true, message: "Product created successfully", data: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get All Products
exports.getAllCategorieProducts = async (req, res) => {
  try {
    const products = await CategorieRestaurantProduct.find();
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get Product by ID
exports.getCategorieProductById = async (req, res) => {
  try {
    const product = await CategorieRestaurantProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update Product
exports.updateCategorieProduct = async (req, res) => {
  try {
    const { name, rating, content, locationName, categorie } = req.body;

    let updateData = {
      name,
      rating,
      content,
      categorie,
    };

    if (locationName) {
      updateData.locationName = locationName.split(",");
    }

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      updateData.image = result.secure_url;
    }

    const updatedProduct = await CategorieRestaurantProduct.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedProduct) return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, message: "Product updated", data: updatedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Delete Product
exports.deleteCategorieProduct = async (req, res) => {
  try {
    const deleted = await CategorieRestaurantProduct.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get Products by Categorie ID
exports.getCategorieProductsByCategorieId = async (req, res) => {
  try {
    const { categorieId } = req.params;
    const products = await CategorieRestaurantProduct.find({ categorie: categorieId });

    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};