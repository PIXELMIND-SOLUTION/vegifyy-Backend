const User = require('../models/userModel');

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { userId, itemId } = req.body;
    const userData = await User.findById(userId);
    const cartData = userData.cartData || {};

    if (!cartData[itemId]) {
      cartData[itemId] = 1;
    } else {
      cartData[itemId] += 1;
    }

    await User.findByIdAndUpdate(userId, { cartData });
    return res.json({ success: true, message: "Added To Cart." });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: "Error adding to cart. Please try again later.",
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { userId, itemId } = req.body;
    const userData = await User.findById(userId);
    const cartData = userData.cartData || {};

    if (cartData[itemId] && cartData[itemId] > 0) {
      cartData[itemId] -= 1;
    } else {
      return res.json({ success: false, message: "Cart empty." });
    }

    await User.findByIdAndUpdate(userId, { cartData });
    return res.json({ success: true, message: "Removed from Cart." });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: "Error removing from cart. Please try again later.",
    });
  }
};

// Get cart data
const getCartData = async (req, res) => {
  try {
    const { userId } = req.body;
    const userData = await User.findById(userId);
    const cartData = userData.cartData || {};
    return res.json({ success: true, cartData });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: "Error retrieving cart. Please try again later.",
    });
  }
};

module.exports = {
  addToCart,
  removeFromCart,
  getCartData
};
