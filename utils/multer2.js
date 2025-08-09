const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if ([".jpg", ".jpeg", ".png"].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"));
  }
};

const upload = multer({ storage, fileFilter });

const multiUpload = upload.fields([
  { name: "recommendedImages", maxCount: 50 },
  { name: "addonImage", maxCount: 50 }
]);

module.exports = multiUpload;
