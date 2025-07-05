const HelpUs = require('../models/helpUsModel');

// POST: Submit issue
const submitHelpUs = async (req, res) => {
  try {
    const { name, email, issueType, description } = req.body;

    // Validate input
    if (!name || !email || !issueType || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const issue = await HelpUs.create({ name, email, issueType, description });

    res.status(201).json({ message: "Issue submitted successfully", data: issue });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// GET: Fetch all help requests (optional)
const getAllHelpUs = async (req, res) => {
  try {
    const issues = await HelpUs.find().sort({ createdAt: -1 });
    res.status(200).json({ message: "Help issues fetched", data: issues });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  submitHelpUs,
  getAllHelpUs
};
