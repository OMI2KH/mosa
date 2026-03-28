const axios = require('axios');

const TELEBIRR_API_URL = process.env.TELEBIRR_API_URL;
const TELEBIRR_API_KEY = process.env.TELEBIRR_API_KEY;

/**
 * Initiate a Telebirr payment
 * @param {string} orderId - Unique order identifier
 * @param {number} amount - Amount in ETB
 * @returns {Promise<Object>} - Payment response
 */
const initiatePayment = async (orderId, amount) => {
  const response = await axios.post(
    `${TELEBIRR_API_URL}/initiate`,
    { orderId, amount, currency: 'ETB' },
    { headers: { Authorization: `Bearer ${TELEBIRR_API_KEY}` } }
  );
  return response.data;
};

/**
 * Verify Telebirr payment status
 * @param {string} transactionId - Transaction ID from Telebirr
 * @returns {Promise<Object>} - Verification result
 */
const verifyPayment = async (transactionId) => {
  const response = await axios.get(`${TELEBIRR_API_URL}/verify/${transactionId}`, {
    headers: { Authorization: `Bearer ${TELEBIRR_API_KEY}` }
  });
  return response.data;
};

module.exports = {
  initiatePayment,
  verifyPayment
};
