const express = require('express');
const router = express.Router();
const {savePrivacyPolicy,getPrivacyPolicy} = require('../controllers/privacyPolicyController');
const {upsertAboutUs,getAboutUs} = require('../controllers/aboutUsController');
const { submitHelpUs, getAllHelpUs } = require('../controllers/helpUsControler');
const {createNotification,getAllNotifications,markAsRead,deleteNotification} = require('../controllers/notificationController');
const controller = require("../controllers/orderControler");
const upload = require("../utils/multer");

// ---------- PRODUCT ROUTES ----------
router.post("/product", upload.single("image"), controller.createProduct);
router.get("/products", controller.getAllProducts);
router.get("/product/:productId", controller.getProductById);
router.get("/products/search", controller.searchProducts);
router.put("/product/:productId", controller.updateProduct);
router.delete("/product/:productId", controller.deleteProduct);
router.get('/category/:category', controller.getProductByCategory);
// Toggle wishlist (add/remove)
router.post("/wishlist/:userId",controller.addToWishlist);

// Get all wishlist items
router.get("/wishlist/:userId", controller.getWishlist);

// Remove a specific item
router.delete("/wishlist/:userId/:productId", controller.removeFromWishlist);



// ---------- ORDER ROUTES ----------
router.post("/order", controller.createOrder);
router.get("/orders", controller.getAllOrders);
router.get("/order/:orderId", controller.getOrderById);
router.put("/order/:orderId", controller.updateOrder);
router.delete("/order/:orderId", controller.deleteOrder);

// Extra Order Features
router.patch("/order/:orderId/accept", controller.vendorAcceptOrder);
router.patch("/order/:orderId/assign-delivery", controller.assignDeliveryAndTrack);



router.post('/help', submitHelpUs);
router.get('/help', getAllHelpUs); // Optional: only if admin needs to see the list



//privacy policy
router.post('/privacy-policy', savePrivacyPolicy);
router.get('/privacy-policy', getPrivacyPolicy);




//aboutUs
router.post('/about-us', upsertAboutUs);  
router.get('/about-us', getAboutUs); 




 //notification route
router.post('/notification', createNotification);
router.get('/notification', getAllNotifications);
router.put('/notification/read/:id', markAsRead);
router.delete('/notification/:id', deleteNotification);

module.exports = router;
