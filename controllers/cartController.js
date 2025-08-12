const mongoose = require('mongoose');
const Cart = require('../models/cartModel');
const RestaurantProduct = require('../models/restaurantProductModel');

exports.addToCart = async (req, res) => {
   try {
    const { userId, products } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Valid userId is required." });
    }
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Products array is required." });
    }

    // Fetch or create the cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        products: [],
        subTotal: 0,
        deliveryCharge: 20,
        finalAmount: 0,
        totalItems: 0,
      });
    }

    for (const item of products) {
      const { restaurantProductId, recommendedId, quantity } = item;

      if (!mongoose.Types.ObjectId.isValid(restaurantProductId)) {
        return res.status(400).json({ success: false, message: `Invalid restaurantProductId: ${restaurantProductId}` });
      }
      if (!mongoose.Types.ObjectId.isValid(recommendedId)) {
        return res.status(400).json({ success: false, message: `Invalid recommendedId: ${recommendedId}` });
      }
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ success: false, message: "Quantity must be zero or more." });
      }

      const restaurantProduct = await RestaurantProduct.findById(restaurantProductId);
      if (!restaurantProduct) {
        return res.status(404).json({ success: false, message: `RestaurantProduct not found: ${restaurantProductId}` });
      }

      const recommendedItem = restaurantProduct.recommended.id(recommendedId);
      if (!recommendedItem) {
        return res.status(404).json({ success: false, message: `Recommended product not found: ${recommendedId}` });
      }

      // Calculate price per unit
      let pricePerUnit = 0;
      const variation = recommendedItem.addons?.variation;
      if (variation?.type === "Half") {
        pricePerUnit = Number(variation.price) || 0;
      } else if (variation?.type === "Full") {
        pricePerUnit = Number(variation.price || recommendedItem.price) || 0;
      } else {
        pricePerUnit = Number(recommendedItem.price) || 0;
      }

      const plates = recommendedItem.addons?.plates;
      const platesPrice = plates ? Number(plates.totalPlatesPrice || 0) : 0;

      const productTotal = (pricePerUnit * quantity) + platesPrice;

      // Find if product already in cart
      const existingIndex = cart.products.findIndex(p =>
        p.restaurantProductId.toString() === restaurantProductId &&
        p.recommendedId.toString() === recommendedId
      );

      if (quantity === 0) {
        // Remove product if quantity zero
        if (existingIndex !== -1) {
          cart.products.splice(existingIndex, 1);
        }
      } else {
        // Build product object snapshot
        const productObj = {
          restaurantProductId,
          recommendedId,
          quantity,
          name: recommendedItem.name || "",
          basePrice: Number(recommendedItem.price) || 0,
          addons: {
            productName: recommendedItem.addons?.productName || "",
            variation: {
              name: variation?.name || "",
              type: variation?.type || null,
              price: Number(variation?.price) || 0,
            },
            plates: {
              name: plates?.name || "",
              item: plates?.item || 0,
              platePrice: Number(plates?.platePrice) || 0,
              totalPlatesPrice: platesPrice,
            },
            variations: recommendedItem.addons?.variations || [],
          },
          image: recommendedItem.image || "",
        };

        if (existingIndex !== -1) {
          // Update existing product quantity and details
          cart.products[existingIndex] = productObj;
        } else {
          // Add new product
          cart.products.push(productObj);
        }
      }
    }

    // Recalculate totals
    let subTotal = 0;
    let totalItems = 0;
    for (const prod of cart.products) {
      let unitPrice = prod.addons?.variation?.price || prod.basePrice;
      if (prod.addons?.variation?.type === 'Half' || prod.addons?.variation?.type === 'Full') {
        unitPrice = Number(prod.addons.variation.price);
      } else {
        unitPrice = Number(prod.basePrice);
      }
      const platesPrice = prod.addons?.plates?.totalPlatesPrice || 0;
      subTotal += (unitPrice * prod.quantity) + platesPrice;
      totalItems += prod.quantity;
    }

    const deliveryCharge = 20;
    const finalAmount = subTotal + deliveryCharge;

    cart.subTotal = subTotal;
    cart.deliveryCharge = deliveryCharge;
    cart.finalAmount = finalAmount;
    cart.totalItems = totalItems;

    await cart.save();

    return res.status(200).json({ success: true, cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all carts
exports.getAllCarts = async (req, res) => {
  try {
    const carts = await Cart.find().populate('userId', 'name email').lean();
    return res.status(200).json({ success: true, carts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get cart by userId
exports.getCartByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }
    const cart = await Cart.findOne({ userId }).lean();
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found for this user." });
    }
    return res.status(200).json({ success: true, cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get cart by cart ID
exports.getCartById = async (req, res) => {
  try {
    const { cartId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      return res.status(400).json({ success: false, message: "Invalid cartId" });
    }
    const cart = await Cart.findById(cartId).lean();
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found." });
    }
    return res.status(200).json({ success: true, cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateByCartId = async (req, res) => {
try {
    const { cartId } = req.params;
    const { products } = req.body; // array of { restaurantProductId, recommendedId, quantity }

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      return res.status(400).json({ success: false, message: "Invalid cartId." });
    }
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Products array is required." });
    }

    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found." });
    }

    for (const item of products) {
      const { restaurantProductId, recommendedId, quantity } = item;

      if (!mongoose.Types.ObjectId.isValid(restaurantProductId)) {
        return res.status(400).json({ success: false, message: `Invalid restaurantProductId: ${restaurantProductId}` });
      }
      if (!mongoose.Types.ObjectId.isValid(recommendedId)) {
        return res.status(400).json({ success: false, message: `Invalid recommendedId: ${recommendedId}` });
      }
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ success: false, message: "Quantity must be zero or more." });
      }

      const restaurantProduct = await RestaurantProduct.findById(restaurantProductId);
      if (!restaurantProduct) {
        return res.status(404).json({ success: false, message: `RestaurantProduct not found: ${restaurantProductId}` });
      }

      const recommendedItem = restaurantProduct.recommended.id(recommendedId);
      if (!recommendedItem) {
        return res.status(404).json({ success: false, message: `Recommended product not found: ${recommendedId}` });
      }

      // Calculate price per unit
      let pricePerUnit = 0;
      const variation = recommendedItem.addons?.variation;
      if (variation?.type === "Half") {
        pricePerUnit = Number(variation.price) || 0;
      } else if (variation?.type === "Full") {
        pricePerUnit = Number(variation.price || recommendedItem.price) || 0;
      } else {
        pricePerUnit = Number(recommendedItem.price) || 0;
      }

      const plates = recommendedItem.addons?.plates;
      const platesPrice = plates ? Number(plates.totalPlatesPrice || 0) : 0;

      // Find product in cart
      const existingIndex = cart.products.findIndex(p =>
        p.restaurantProductId.toString() === restaurantProductId &&
        p.recommendedId.toString() === recommendedId
      );

      if (quantity === 0) {
        // Remove if quantity zero
        if (existingIndex !== -1) {
          cart.products.splice(existingIndex, 1);
        }
      } else {
        const productObj = {
          restaurantProductId,
          recommendedId,
          quantity,
          name: recommendedItem.name || "",
          basePrice: Number(recommendedItem.price) || 0,
          addons: {
            productName: recommendedItem.addons?.productName || "",
            variation: {
              name: variation?.name || "",
              type: variation?.type || null,
              price: Number(variation?.price) || 0,
            },
            plates: {
              name: plates?.name || "",
              item: plates?.item || 0,
              platePrice: Number(plates?.platePrice) || 0,
              totalPlatesPrice: platesPrice,
            },
            variations: recommendedItem.addons?.variations || [],
          },
          image: recommendedItem.image || "",
        };

        if (existingIndex !== -1) {
          cart.products[existingIndex] = productObj;
        } else {
          // If product not already in cart, add it (optional, or reject)
          cart.products.push(productObj);
        }
      }
    }

    // Recalculate totals
    let subTotal = 0;
    let totalItems = 0;
    for (const prod of cart.products) {
      let unitPrice = prod.addons?.variation?.price || prod.basePrice;
      if (prod.addons?.variation?.type === 'Half' || prod.addons?.variation?.type === 'Full') {
        unitPrice = Number(prod.addons.variation.price);
      } else {
        unitPrice = Number(prod.basePrice);
      }
      const platesPrice = prod.addons?.plates?.totalPlatesPrice || 0;
      subTotal += (unitPrice * prod.quantity) + platesPrice;
      totalItems += prod.quantity;
    }

    const deliveryCharge = 20;
    const finalAmount = subTotal + deliveryCharge;

    cart.subTotal = subTotal;
    cart.deliveryCharge = deliveryCharge;
    cart.finalAmount = finalAmount;
    cart.totalItems = totalItems;

    await cart.save();

    return res.status(200).json({ success: true, cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// Delete cart by ID
exports.deleteProductFromCartById = async (req, res) => {
  try {
    const { cartId } = req.params;
    const { restaurantProductId, recommendedId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      return res.status(400).json({ success: false, message: "Invalid cartId." });
    }
    if (!mongoose.Types.ObjectId.isValid(restaurantProductId)) {
      return res.status(400).json({ success: false, message: "Invalid restaurantProductId." });
    }
    if (!mongoose.Types.ObjectId.isValid(recommendedId)) {
      return res.status(400).json({ success: false, message: "Invalid recommendedId." });
    }

    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found." });
    }

    const productIndex = cart.products.findIndex(p =>
      p.restaurantProductId.toString() === restaurantProductId &&
      p.recommendedId.toString() === recommendedId
    );

    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: "Product not found in cart." });
    }

    // Remove the product
    cart.products.splice(productIndex, 1);

    // Recalculate totals
    let subTotal = 0;
    let totalItems = 0;
    for (const prod of cart.products) {
      let unitPrice = prod.addons?.variation?.price || prod.basePrice;
      if (prod.addons?.variation?.type === 'Half' || prod.addons?.variation?.type === 'Full') {
        unitPrice = Number(prod.addons.variation.price);
      } else {
        unitPrice = Number(prod.basePrice);
      }
      const platesPrice = prod.addons?.plates?.totalPlatesPrice || 0;
      subTotal += (unitPrice * prod.quantity) + platesPrice;
      totalItems += prod.quantity;
    }

    const deliveryCharge = 20;
    const finalAmount = subTotal + deliveryCharge;

    cart.subTotal = subTotal;
    cart.deliveryCharge = deliveryCharge;
    cart.finalAmount = finalAmount;
    cart.totalItems = totalItems;

    await cart.save();

    return res.status(200).json({ success: true, cart });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
