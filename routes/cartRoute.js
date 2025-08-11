const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController'); // adjust path

// Add or update cart
router.post('/cart', cartController.addToCart);



// Get cart by userId (summary only)
router.get('/cart/user/:userId', cartController.getCartByUserId);


// Get all carts (summary only)
router.get('/cart', cartController.getAllCarts);


module.exports = router;
