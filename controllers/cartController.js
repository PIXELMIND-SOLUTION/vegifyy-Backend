const mongoose = require('mongoose');
const Cart = require('../models/cartModel');
const RestaurantProduct = require('../models/restaurantProductModel');

exports.addToCart = async (req, res) => {
    try {
        const { userId, products } = req.body;

        // Validate input
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Valid userId is required.' });
        }
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, message: 'Products array is required and cannot be empty.' });
        }

        let subTotal = 0;
        let totalItems = 0;
        const enrichedProducts = [];

        for (const item of products) {
            const { restaurantProductId, recommendedId, quantity } = item;

            if (!mongoose.Types.ObjectId.isValid(restaurantProductId)) {
                return res.status(400).json({ success: false, message: `Invalid restaurantProductId: ${restaurantProductId}` });
            }
            if (!mongoose.Types.ObjectId.isValid(recommendedId)) {
                return res.status(400).json({ success: false, message: `Invalid recommendedId: ${recommendedId}` });
            }
            if (!quantity || quantity < 1) {
                return res.status(400).json({ success: false, message: `Quantity must be at least 1 for product ${restaurantProductId}` });
            }

            // Fetch product from DB
            const restaurantProduct = await RestaurantProduct.findById(restaurantProductId);
            if (!restaurantProduct) {
                return res.status(404).json({ success: false, message: `RestaurantProduct not found: ${restaurantProductId}` });
            }

            // Find recommended item in product's recommended array
            const recommendedItem = restaurantProduct.recommended.id(recommendedId);
            if (!recommendedItem) {
                return res.status(404).json({ success: false, message: `Recommended product not found: ${recommendedId}` });
            }

            // Calculate price per unit based on variation
            let pricePerUnit = 0;
            const variation = recommendedItem.addons?.variation;
            if (variation?.type === "Half") {
                pricePerUnit = Number(variation.price) || 0;
            } else if (variation?.type === "Full") {
                pricePerUnit = Number(variation.price || recommendedItem.price) || 0;
            } else {
                pricePerUnit = Number(recommendedItem.price) || 0;
            }

            const platesPrice = Number(recommendedItem.addons?.plates?.totalPlatesPrice) || 0;
            const productTotal = (pricePerUnit * quantity) + platesPrice;

            subTotal += productTotal;
            totalItems += quantity;

            enrichedProducts.push({
                restaurantProductId,
                recommendedId,
                quantity,
                name: recommendedItem.name || '',
                basePrice: Number(recommendedItem.price) || 0,
                variationType: variation?.type || null,
                variationPrice: Number(variation?.price) || 0,
                platesName: recommendedItem.addons?.plates?.name || '',
                platePrice: Number(recommendedItem.addons?.plates?.price) || 0,
                totalPlatesPrice: platesPrice,
                image: recommendedItem.image || '',
            });
        }

        const deliveryCharge = 20;
        const finalAmount = subTotal + deliveryCharge;

      // Find cart for user
let cart = await Cart.findOne({ userId });

if (cart) {
  cart.products = enrichedProducts;
  cart.subTotal = subTotal;
  cart.deliveryCharge = deliveryCharge;
  cart.finalAmount = finalAmount;
  cart.totalItems = totalItems;
  await cart.save();
} else {
  cart = await Cart.create({
    userId,
    products: enrichedProducts,
    subTotal,
    deliveryCharge,
    finalAmount,
    totalItems,
  });
}

// Fetch fresh cart to be safe
const freshCart = await Cart.findById(cart._id);

console.log('freshCart:', freshCart);

return res.status(200).json({
  success: true,
  message: 'Cart updated successfully',
  data: {
    cartId: freshCart._id.toString(),
    totalItems: freshCart.totalItems,
    subTotal: freshCart.subTotal,
    deliveryCharge: freshCart.deliveryCharge,
    finalAmount: freshCart.finalAmount,
  },
});
    } catch (error) {
        console.error('addToCart error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// In your cartController.js
exports.getAllCarts = async (req, res) => {
    try {
        const carts = await Cart.find({})
            .select('userId subTotal deliveryCharge finalAmount totalItems createdAt')
            .lean();

        if (!carts || carts.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No carts found',
                data: [],
                count: 0
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Carts retrieved successfully',
            data: carts,
            count: carts.length
        });
    } catch (error) {
        console.error('getAllCarts error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Get cart by user ID
exports.getCartByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cart not found for this user',
                data: null
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cart retrieved successfully',
            data: cart
        });

    } catch (error) {
        console.error('getCartByUserId error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Update cart by user ID (similar to addToCart but with partial updates)
exports.updateCartByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const { products } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ success: false, message: 'Products array is required' });
        }

        // Similar product processing logic as addToCart
        let subTotal = 0;
        let totalItems = 0;
        const enrichedProducts = [];

        for (const item of products) {
            // ... same product processing logic as addToCart ...
            // Include all the validation and price calculation logic
        }

        const deliveryCharge = 20;
        const finalAmount = subTotal + deliveryCharge;

        const cart = await Cart.findOneAndUpdate(
            { userId },
            {
                products: enrichedProducts,
                subTotal,
                deliveryCharge,
                finalAmount,
                totalItems
            },
            { new: true, upsert: true } // Return updated doc, create if doesn't exist
        );

        return res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            data: {
                cartId: cart._id.toString(),
                totalItems: cart.totalItems,
                subTotal: cart.subTotal,
                deliveryCharge: cart.deliveryCharge,
                finalAmount: cart.finalAmount,
            },
        });

    } catch (error) {
        console.error('updateCartByUserId error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Update cart by cart ID
exports.updateCartById = async (req, res) => {
    try {
        const { id } = req.params;
        const { products } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid cart ID' });
        }

        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ success: false, message: 'Products array is required' });
        }

        // Similar product processing logic as addToCart
        let subTotal = 0;
        let totalItems = 0;
        const enrichedProducts = [];

        for (const item of products) {
            // ... same product processing logic as addToCart ...
            // Include all the validation and price calculation logic
        }

        const deliveryCharge = 20;
        const finalAmount = subTotal + deliveryCharge;

        const cart = await Cart.findByIdAndUpdate(
            id,
            {
                products: enrichedProducts,
                subTotal,
                deliveryCharge,
                finalAmount,
                totalItems
            },
            { new: true } // Return updated doc
        );

        if (!cart) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cart not found' 
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            data: {
                cartId: cart._id.toString(),
                totalItems: cart.totalItems,
                subTotal: cart.subTotal,
                deliveryCharge: cart.deliveryCharge,
                finalAmount: cart.finalAmount,
            },
        });

    } catch (error) {
        console.error('updateCartById error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Delete cart by user ID
exports.deleteCartByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const cart = await Cart.findOneAndDelete({ userId });

        if (!cart) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cart not found for this user' 
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cart deleted successfully',
            data: {
                cartId: cart._id.toString(),
                deletedCount: 1
            }
        });

    } catch (error) {
        console.error('deleteCartByUserId error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Delete cart by cart ID
exports.deleteCartById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid cart ID' });
        }

        const cart = await Cart.findByIdAndDelete(id);

        if (!cart) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cart not found' 
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cart deleted successfully',
            data: {
                cartId: cart._id.toString(),
                deletedCount: 1
            }
        });

    } catch (error) {
        console.error('deleteCartById error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};
