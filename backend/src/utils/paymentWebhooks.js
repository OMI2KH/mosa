const prisma = require('../lib/prisma');
const crypto = require('crypto');

// Utility to verify webhook signature (if API provides HMAC or secret)
const verifyWebhookSignature = (req, secret) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signature === hash;
};

const handlePaymentWebhook = async (req, res) => {
  try {
    const { paymentMethod } = req.params; // telebirr or cbebirr
    const secret = paymentMethod === 'telebirr' ? process.env.TELEBIRR_WEBHOOK_SECRET : process.env.CBEBIRR_WEBHOOK_SECRET;

    // Optional: Verify signature
    if (!verifyWebhookSignature(req, secret)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const { orderId, subId, status, amount } = req.body;

    if (orderId) {
      // Handle order payment update
      await prisma.order.update({
        where: { id: orderId },
        data: { status: status === 'success' ? 'paid' : 'failed' },
      });
    }

    if (subId) {
      // Handle subscription payment update
      await prisma.subscription.updateMany({
        where: {
          OR: [
            { telebirrSubId: subId },
            { cbebirrSubId: subId }
          ]
        },
        data: { status: status === 'success' ? 'active' : 'failed' }
      });
    }

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
};

module.exports = {
  handlePaymentWebhook,
};
