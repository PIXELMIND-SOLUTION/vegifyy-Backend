const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create the uploads folder if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Configure storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Define accepted fields
const upload = multer({ storage }).fields([
  { name: "productImages", maxCount: 5 },
  { name: "reviewImages", maxCount: 5 }
]);

module.exports = upload;
