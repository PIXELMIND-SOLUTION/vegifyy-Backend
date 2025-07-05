const PrivacyPolicy = require('../models/privacyPolicyModel');

// Create or Update Privacy Policy
const savePrivacyPolicy = async (req, res) => {
  const { content } = req.body;

  try {
    let policy = await PrivacyPolicy.findOne();

    if (policy) {
      policy.content = content;
      await policy.save();
    } else {
      policy = await PrivacyPolicy.create({ content });
    }

    res.status(200).json({
      success: true,
      message: 'Privacy Policy saved successfully',
      data: policy
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Privacy Policy
const getPrivacyPolicy = async (req, res) => {
  try {
    const policy = await PrivacyPolicy.findOne();

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Privacy Policy not found' });
    }

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  savePrivacyPolicy,
  getPrivacyPolicy
};
