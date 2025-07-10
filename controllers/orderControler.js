const { Product, Order } = require('../models/orderModel');

//
// ✅ PRODUCT CONTROLLERS
//

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const { name, price, category, stock, description } = req.body;

    const product = new Product({ name, price, category, stock, description });
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Product creation failed', error: err.message });
  }
};

// Get All Products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: err.message });
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });

    res.status(200).json({ success: true, message: 'Product updated', data: updatedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Product update failed', error: err.message });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    await Product.findByIdAndDelete(productId);

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Product deletion failed', error: err.message });
  }
};


//
// ✅ ORDER CONTROLLERS
//

// ✅ Create Order
exports.createOrder = async (req, res) => {
  try {
    const { userId, items } = req.body;

    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'User ID and items are required' });
    }

    let totalAmount = 0;

    const updatedItems = await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      return {
        productId: product._id,
        quantity: item.quantity,
        price: product.price
      };
    }));

    const order = new Order({
      userId,
      items: updatedItems,
      totalAmount
    });

    await order.save();

    res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Order creation failed', error: error.message });
  }
};


// 📥 Get Order History by User ID
exports.getOrderHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId }).populate('items.productId');

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order history', error: error.message });
  }
};


// ✏️ Update Order Status (e.g., to 'shipped', 'delivered')
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatus = ['pending', 'confirmed', 'cancelled', 'shipped', 'delivered'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const updated = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, message: 'Order status updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update order status', error: error.message });
  }
};


// 🗑️ Delete Order
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const deleted = await Order.findByIdAndDelete(orderId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Order deletion failed', error: error.message });
  }
};

//Get all products (search base)
// ✅ Search Products
exports. searchProducts = async (req, res) => {
  try {
    const { name, category, minPrice, maxPrice } = req.query;

    const filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(filter);
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed', error: err.message });
  }
};
