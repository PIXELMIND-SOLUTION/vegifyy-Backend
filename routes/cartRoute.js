const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController'); // adjust path

// Add or update cart
router.post('/cart', cartController.addToCart);


// Get all carts (summary only)
router.get("/cart", cartController.getAllCarts);
router.get("/cart/user/:userId", cartController.getCartByUserId);
router.get("/cart/:cartId", cartController.getCartById);

// Update cart by cart ID
router.patch('/cart/:cartId', cartController.updateByCartId);


// Delete cart by cart ID
router.delete('/cart/:cartid', cartController.deleteProductFromCartById);

module.exports = router;
