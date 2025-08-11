const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController'); // adjust path

// Add or update cart
router.post('/cart', cartController.addToCart);


// Get all carts (summary only)
router.get('/cart', cartController.getAllCarts);

// Get cart by user ID
router.get('/cart/:userId', cartController.getCartByUserId);

// Update cart by user ID
router.put('/cart/user/:userId', cartController.updateCartByUserId);

// Update cart by cart ID
router.put('/cart/:id', cartController.updateCartById);

// Delete cart by user ID
router.delete('/cart/user/:userId', cartController.deleteCartByUserId);

// Delete cart by cart ID
router.delete('/cart/:id', cartController.deleteCartById);

module.exports = router;
