const express = require('express');
const prisma = require('../lib/prisma'); // Ensure Prisma client is exported from lib/prisma.js
const { z } = require('zod');
const axios = require('axios');

const router = express.Router();

// --------------------
// ✅ Subscription Schema
// --------------------
const subscriptionSchema = z.object({
  paymentMethod: z.enum(['telebirr', 'cbebirr']),
  plan: z.enum(['basic'])
});

// --------------------
// ✅ Create Subscription
// --------------------
router.post('/create', async (req, res) => {
  try {
    const { paymentMethod, plan } = subscriptionSchema.parse(req.body);
    const userId = req.user.userId;

    // Check if user already has an active subscription
    const existing = await prisma.subscription.findFirst({
      where: { userId, status: 'active' }
    });
    if (existing) {
      return res.status(400).json({ error: 'Active subscription already exists.' });
    }

    const total = parseFloat(process.env.SUB_PRICE || '49');
    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const subscriptionData = {
      userId,
      plan,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
    subscriptionData[paymentMethod === 'telebirr' ? 'telebirrSubId' : 'cbebirrSubId'] = subId;

    const subscription = await prisma.subscription.create({ data: subscriptionData });

    // Payment API call (mock)
    const apiUrl = paymentMethod === 'telebirr' ? process.env.TELEBIRR_API_URL : process.env.CBEBIRR_API_URL;
    const apiKey = paymentMethod === 'telebirr' ? process.env.TELEBIRR_API_KEY : process.env.CBEBIRR_API_KEY;

    await axios.post(`${apiUrl}/subscribe`, {
      subId,
      amount: total,
      currency: 'ETB'
    }, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    res.status(201).json({
      subscription,
      message: `Subscribed – Forge unlocked for ${total} ETB/month.`
    });

  } catch (error) {
    console.error('Subscription creation error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors.map(e => e.message) });
    }
    res.status(500).json({ error: 'Subscription creation failed' });
  }
});

// --------------------
// ✅ Get User Subscription
// --------------------
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { user: true }
    });
    res.json(subscription || null);
  } catch (error) {
    console.error('Fetch subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

module.exports = router;

