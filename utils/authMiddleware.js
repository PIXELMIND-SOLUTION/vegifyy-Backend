const multer = require("multer");
const path = require("path");

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // adjust this path
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Upload with multiple field support
const uploads = multer({ storage }).fields([
  { name: "recommendedImages", maxCount: 10 },
  { name: "addonImage", maxCount: 1 },
]);

module.exports = uploads;
