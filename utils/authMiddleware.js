// middleware/multer.js

const multer = require("multer");
const path = require("path");

// Storage config for local uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Folder must exist
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// Multer setup with multiple fields
const uploads = multer({ storage }).fields([
  { name: "recommendedImages", maxCount: 40 }, // Expected array
  { name: "addonImage", maxCount: 1 }          // Optional
]);

module.exports = uploads;
