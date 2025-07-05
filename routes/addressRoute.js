const express = require('express');
const router = express.Router();
const {savePrivacyPolicy,getPrivacyPolicy} = require('../controllers/privacyPolicyController');
const {upsertAboutUs,getAboutUs} = require('../controllers/aboutUsController');
const {createItem,searchItems} = require('../controllers/searchController');
const {createOrder,cancelOrder,getOrderHistory} = require('../controllers/orderControler');
const {createProduct,getAllProducts,updateProduct,deleteProduct} = require('../controllers/orderControler');
const { submitHelpUs, getAllHelpUs } = require('../controllers/helpUsControler');
const {
  createNotification,
  getAllNotifications,
  markAsRead,
  deleteNotification
} = require('../controllers/notificationController');



// POST /api/orders
router.post('/order', createOrder);

// PUT /api/orders/cancel/:orderId
router.put('/cancel/:orderId', cancelOrder);

// GET /api/orders/history/:userId
router.get('/history/:userId', getOrderHistory);

router.post('/products', createProduct);               // Create product
router.get('/products', getAllProducts);               // Get all products
router.put('/products/:productId', updateProduct);     // Update product
router.delete('/products/:productId', deleteProduct);  // Delete product
 

router.post('/help', submitHelpUs);
router.get('/help', getAllHelpUs); // Optional: only if admin needs to see the list






//privacy policy
router.post('/privacy-policy', savePrivacyPolicy);
router.get('/privacy-policy', getPrivacyPolicy);




//aboutUs
router.post('/about-us', upsertAboutUs);  
router.get('/about-us', getAboutUs); 




//search route
router.post('/search', createItem);     // Add item
router.get('/search', searchItems); // Search



//notification route
router.post('/notification', createNotification);
router.get('/notification', getAllNotifications);
router.put('/notification/read/:id', markAsRead);
router.delete('/notification/:id', deleteNotification);


module.exports = router;
