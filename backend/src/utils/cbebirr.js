const axios = require('axios');

const CBEBIRR_API_URL = process.env.CBEBIRR_API_URL;
const CBEBIRR_API_KEY = process.env.CBEBIRR_API_KEY;

/**
 * Initiate a CBE Birr payment
 * @param {string} orderId - Unique order identifier
 * @param {number} amount - Amount in ETB
 * @returns {Promise<Object>} - Payment response
 */
const initiatePayment = async (orderId, amount) => {
  const response = await axios.post(
    `${CBEBIRR_API_URL}/initiate`,
    { orderId, amount, currency: 'ETB' },
    { headers: { Authorization: `Bearer ${CBEBIRR_API_KEY}` } }
  );
  return response.data;
};

/**
 * Verify CBE Birr payment status
 * @param {string} transactionId - Transaction ID from CBE Birr
 * @returns {Promise<Object>} - Verification result
 */
const verifyPayment = async (transactionId) => {
  const response = await axios.get(`${CBEBIRR_API_URL}/verify/${transactionId}`, {
    headers: { Authorization: `Bearer ${CBEBIRR_API_KEY}` }
  });
  return response.data;
};

module.exports = {
  initiatePayment,
  verifyPayment,
};
