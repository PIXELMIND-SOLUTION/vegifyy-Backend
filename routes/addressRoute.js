const express = require('express');
const router = express.Router();
const {savePrivacyPolicy,getPrivacyPolicy} = require('../controllers/privacyPolicyController');
const {upsertAboutUs,getAboutUs} = require('../controllers/aboutUsController');
const {createProduct,getAllProducts,updateProduct,deleteProduct,createOrder,getOrderHistory,updateOrderStatus,deleteOrder,searchProducts} = require('../controllers/orderControler');
const { submitHelpUs, getAllHelpUs } = require('../controllers/helpUsControler');
const {createNotification,getAllNotifications,markAsRead,deleteNotification} = require('../controllers/notificationController');



//
// ✅ Product Routes
//
router.post('/products', createProduct);             // Create Product
router.get('/products', getAllProducts);             // Get All Products
router.put('/products/:productId', updateProduct);   // Update Product
router.delete('/products/:productId', deleteProduct);// Delete Product

//
// ✅ Order Routes
//
router.post('/orders', createOrder);                  // Create Order
router.get('/orders/:userId', getOrderHistory);       // Get Orders by User ID
router.put('/orders/:orderId', updateOrderStatus);         // ✏️ Update order status
router.delete('/orders/:orderId', deleteOrder); 

router.post('/help', submitHelpUs);
router.get('/help', getAllHelpUs); // Optional: only if admin needs to see the list



//privacy policy
router.post('/privacy-policy', savePrivacyPolicy);
router.get('/privacy-policy', getPrivacyPolicy);




//aboutUs
router.post('/about-us', upsertAboutUs);  
router.get('/about-us', getAboutUs); 




//search route
router.get('/search', searchProducts); // Example: /search?name=apple&category=Fruits



 //notification route
router.post('/notification', createNotification);
router.get('/notification', getAllNotifications);
router.put('/notification/read/:id', markAsRead);
router.delete('/notification/:id', deleteNotification);

module.exports = router;
