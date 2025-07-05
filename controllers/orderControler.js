const { Product, Order } = require('../models/orderModel');

//
//PRODUCT CONTROLLERS
//

const createProduct = async (req, res) => {
  try {
    const { name, price, category, stock, description } = req.body;
    const product = await Product.create({ name, price, category, stock, description });
    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Create failed', error: err.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetch failed', error: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updated = await Product.findByIdAndUpdate(productId, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, message: 'Product updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const deleted = await Product.findByIdAndDelete(productId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, message: 'Product deleted', data: deleted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed', error: err.message });
  }
};


//
//ORDER CONTROLLERS
//

const createOrder = async (req, res) => {
  try {
    const { userId, items, totalAmount, status } = req.body;

    const order = await Order.create({ userId, items, totalAmount, status });
    res.status(201).json({ success: true, message: 'Order created', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Order creation failed', error: error.message });
  }
};

const getOrderHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).populate('items.productId');
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Order fetch failed', error: error.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const cancelled = await Order.findByIdAndUpdate(
      orderId,
      { status: 'cancelled' },
      { new: true }
    );

    if (!cancelled) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, message: 'Order cancelled', data: cancelled });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Cancel failed', error: err.message });
  }
};


//
// EXPORT ALL
//

module.exports = {
  // Product
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,

  // Order
  createOrder,
  getOrderHistory,
  cancelOrder
};
