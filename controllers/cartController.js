const mongoose = require('mongoose');
const Cart = require('../models/cartModel');
const RestaurantProduct = require('../models/restaurantProductModel');

exports.addToCart = async (req, res) => {
    try {
        const { userId } = req.params;
        const { products, clearExisting = false } = req.body;

        // Validate inputs
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Valid userId is required." });
        }
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ success: false, message: "Products array is required." });
        }

        // Load or initialize user's cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId,
                products: [],
                subTotal: 0,
                deliveryCharge: 0,
                finalAmount: 0,
                totalItems: 0
            });
        }

        // Clear existing cart if requested
        if (clearExisting) {
            cart.products = [];
            cart.subTotal = 0;
            cart.totalItems = 0;
        }

        // Process each product in input
        for (const item of products) {
            const { restaurantProductId, recommendedId, addOn, quantity = 1, operation = 'add' } = item;

            // Skip if quantity is zero
            if (quantity === 0) continue;

            // Validate product IDs
            if (!mongoose.Types.ObjectId.isValid(restaurantProductId) ||
                !mongoose.Types.ObjectId.isValid(recommendedId)) {
                return res.status(400).json({ success: false, message: "Invalid product IDs." });
            }

            // Fetch product details
            const restaurantProduct = await RestaurantProduct.findById(restaurantProductId);
            if (!restaurantProduct) {
                return res.status(404).json({ success: false, message: "Restaurant product not found." });
            }

            const recommendedItem = restaurantProduct.recommended.id(recommendedId);
            if (!recommendedItem) {
                return res.status(404).json({ success: false, message: "Recommended item not found." });
            }

            // Check if the product has addons defined
            const hasAddons = recommendedItem.addons &&
                (recommendedItem.addons.variation || recommendedItem.addons.plates);

            // Initialize clean addOn object and calculate price
            const addOnClean = {};
            let unitPrice = recommendedItem.price || 0;

            // Process addons if they exist and are provided
            if (hasAddons && addOn) {
                // Handle variation (half/full)
                if (recommendedItem.addons.variation && recommendedItem.addons.variation.type.includes("Half")) {
                    if (addOn.variation === "Half") {
                        addOnClean.variation = "Half";
                        unitPrice = recommendedItem.calculatedPrice?.half ||
                            Math.round(unitPrice * (recommendedItem.vendorHalfPercentage / 100));
                    }
                }

                // Handle plates
                if (recommendedItem.addons.plates && addOn.plateitems && addOn.plateitems > 0) {
                    addOnClean.plateitems = addOn.plateitems;
                    const plateCost = addOn.plateitems * (recommendedItem.vendor_Platecost || 0);
                    unitPrice += plateCost;
                }
            }

            // Prepare product data
            const productData = {
                restaurantProductId,
                recommendedId,
                quantity: Math.abs(quantity), // Ensure quantity is positive
                name: recommendedItem.name,
                basePrice: unitPrice,
                image: recommendedItem.image || ""
            };

            // Include addOn only if supported by the product
            if (hasAddons && Object.keys(addOnClean).length > 0) {
                productData.addOn = addOnClean;
            }

            // Find existing product in cart
            const existingIndex = cart.products.findIndex(
                p => p.restaurantProductId.toString() === restaurantProductId &&
                    p.recommendedId.toString() === recommendedId
            );

            // Handle different operations
            if (existingIndex !== -1) {
                if (operation === 'remove') {
                    // Remove the item completely
                    cart.products.splice(existingIndex, 1);
                } else {
                    // Handle quantity changes
                    const newQuantity = cart.products[existingIndex].quantity + quantity;

                    if (newQuantity <= 0) {
                        // Remove item if quantity would be zero or negative
                        cart.products.splice(existingIndex, 1);
                    } else {
                        // Update the existing item
                        cart.products[existingIndex].quantity = newQuantity;
                        // Update other fields if provided
                        if (productData.addOn) {
                            cart.products[existingIndex].addOn = productData.addOn;
                        }
                        cart.products[existingIndex].basePrice = unitPrice;
                    }
                }
            } else if (operation !== 'remove' && quantity > 0) {
                // Add new item (only if quantity is positive and not a remove operation)
                cart.products.push(productData);
            }
        }

        // Recalculate cart totals
        let subTotal = 0;
        let totalItems = 0;

        for (const prod of cart.products) {
            const restaurantProduct = await RestaurantProduct.findById(prod.restaurantProductId);
            const recommendedItem = restaurantProduct?.recommended.id(prod.recommendedId);
            if (!recommendedItem) continue;

            // Recalculate price to ensure consistency
            let unitPrice = recommendedItem.price || 0;
            const hasAddons = recommendedItem.addons &&
                (recommendedItem.addons.variation || recommendedItem.addons.plates);
            const addOnClean = {};

            if (hasAddons && prod.addOn) {
                // Handle variation
                if (recommendedItem.addons.variation && recommendedItem.addons.variation.type.includes("Half")) {
                    if (prod.addOn.variation === "Half") {
                        addOnClean.variation = "Half";
                        unitPrice = recommendedItem.calculatedPrice?.half ||
                            Math.round(unitPrice * (recommendedItem.vendorHalfPercentage / 100));
                    }
                }

                // Handle plates
                if (recommendedItem.addons.plates && prod.addOn.plateitems && prod.addOn.plateitems > 0) {
                    addOnClean.plateitems = prod.addOn.plateitems;
                    const plateCost = prod.addOn.plateitems * (recommendedItem.vendor_Platecost || 0);
                    unitPrice += plateCost;
                }
            }

            // Update totals
            subTotal += unitPrice * prod.quantity;
            totalItems += prod.quantity;

            // Update product details
            prod.basePrice = unitPrice;
            prod.name = recommendedItem.name;
            prod.image = recommendedItem.image || "";

            // Only keep addOn if the product supports it
            if (hasAddons && Object.keys(addOnClean).length > 0) {
                prod.addOn = addOnClean;
            } else {
                delete prod.addOn;
            }
        }

        // Update cart totals
        cart.subTotal = subTotal;
        cart.totalItems = totalItems;
        cart.deliveryCharge = totalItems === 0 ? 0 : 20;
        cart.finalAmount = subTotal + cart.deliveryCharge;

        await cart.save();
        return res.status(200).json({
            success: true,
            message: "Cart updated successfully",
            cart
        });

    } catch (err) {
        console.error("Cart Operation Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};
// Get all carts
exports.getAllCarts = async (req, res) => {
    try {
        const carts = await Cart.find().populate('userId', 'name email').populate('products.restaurantProductId');

        return res.status(200).json({
            success: true,
            count: carts.length,
            data: carts
        });
    } catch (err) {
        console.error("Get All Carts Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

// Get cart by user ID
exports.getCartByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const cart = await Cart.findOne({ userId })
            .populate('userId', 'name email')
            .populate({
                path: 'products.restaurantProductId',
                populate: {
                    path: 'recommended',
                    model: 'RestaurantProduct'
                }
            });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found for this user"
            });
        }

        return res.status(200).json({
            success: true,
            data: cart
        });
    } catch (err) {
        console.error("Get Cart By User Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};


// Delete cart by user ID
exports.deleteCartByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const deletedCart = await Cart.findOneAndDelete({ userId });

        if (!deletedCart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found for this user"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Cart deleted successfully",
            data: deletedCart
        });
    } catch (err) {
        console.error("Delete Cart By User Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};

// Delete cart by cart ID
exports.deleteCartById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid cart ID"
            });
        }

        const deletedCart = await Cart.findByIdAndDelete(id);

        if (!deletedCart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Cart deleted successfully",
            data: deletedCart
        });
    } catch (err) {
        console.error("Delete Cart By ID Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
};