const express = require('express');
const router = express.Router();
const {savePrivacyPolicy,getPrivacyPolicy} = require('../controllers/privacyPolicyController');
const {upsertAboutUs,getAboutUs} = require('../controllers/aboutUsController');
const { submitHelpUs, getAllHelpUs } = require('../controllers/helpUsControler');
const {createNotification,getAllNotifications,markAsRead,deleteNotification} = require('../controllers/notificationController');
const controller = require('../controllers/orderControler');
const upload = require('../utils/multer');


// ---------- PRODUCT ROUTES ----------
router.post('/product', upload.single('image'), controller.createProduct);
router.get('/products', controller.getAllProducts);
router.get('/product/:id', controller.getProductById);
router.put('/product/:id', upload.single('image'), controller.updateProduct);
router.delete('/product/:id', controller.deleteProduct);

// Get products by category (contentname)
router.get('/products/category/:category', controller.getProductsByCategory);

// Search products
router.get('/products/search/query', controller.searchProducts);

// Wishlist
router.post('/wishlist/toggle/:userId', controller.addToWishlist);
router.get('/wishlist/:userId', controller.getWishlist);
router.delete('/wishlist/:userId/:productId', controller.removeFromWishlist);


// ---------- ORDER ROUTES ----------
router.post('/order', controller.createOrder);
router.get('/orders', controller.getAllOrders);
router.get('/order/:orderId', controller.getOrderById);
router.put('/order/:orderId', controller.updateOrder);
router.delete('/order/:orderId', controller.deleteOrder);

// Vendor accepts order
router.put('/order/:orderId/accept', controller.vendorAcceptOrder);

// Assign delivery partner
router.put('/order/:orderId/assign-delivery', controller.assignDeliveryAndTrack);

// Get today's bookings
router.get('/orders/today', controller.getTodaysBookings);

// Get orders by status
router.post('/orders/status', controller.getOrdersByStatus);


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
