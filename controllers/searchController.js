// controllers/searchController.js
const SearchItem = require('../models/searchModel');

// 🔹 Create new item
const createItem = async (req, res) => {
  try {
    const { name, category, price } = req.body;

  if (!name||!category||!price) return res.status(400).json({ message: 'values is required' });

    const item = await SearchItem.create({ name, category, price });
    res.status(201).json({ message: 'Item created', data: item });
  } catch (err) {
    res.status(500).json({ message: 'Create failed', error: err.message });
  }
};

// 🔹 Search items by query string
const searchItems = async (req, res) => {
  const { q } = req.query;

  try {
    const result = await SearchItem.find({
      name: { $regex: q, $options: 'i' }  // case-insensitive search
    });

    res.status(200).json({ results: result });
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
};

module.exports = { createItem, searchItems };
