// Generates a 7-character alphanumeric referral code like 'A9C3T7Z'
function generateReferralCode(length = 7) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

module.exports = {
  generateReferralCode
};