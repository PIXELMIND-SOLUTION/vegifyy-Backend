const multer = require("multer");


const upload = require("./multer"); // This is your existing multer config

// Middleware to handle multiple field uploads
const productImageUploader = upload.fields([
  { name: "productImage", maxCount: 1 },
  { name: "recommendedImages", maxCount: 10 },
  { name: "addonImage", maxCount: 1 }
]);

module.exports = productImageUploader;
