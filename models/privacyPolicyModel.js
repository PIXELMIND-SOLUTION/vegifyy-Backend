const mongoose = require('mongoose');

const privacyPolicySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('PrivacyPolicy', privacyPolicySchema);
