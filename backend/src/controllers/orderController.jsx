const express = require('express');
const prisma = require('../lib/prisma'); // make sure prisma client is in lib/prisma.js
const { z } = require('zod');
const axios = require('axios');

const router = express.Router();

// --------------------
// ✅ Validation schema
// --------------------
const orderSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  paymentMethod: z.enum(['telebirr', 'cbebirr']),
});

// --------------------
// ✅ Create a new order
// --------------------
router.post('/', async (req, res) => {
  try {
    const { productId, quantity, paymentMethod } = orderSchema.parse(req.body);
    const userId = req.user.userId; // provided by auth middleware

    // Transaction ensures stock and order are consistent
    const order = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || product.stock < quantity) {
        throw new Error('Product unavailable or insufficient stock');
      }

      const total = product.price * quantity;

      // Create order
      const createdOrder = await tx.order.create({
        data: { userId, productId, quantity, total, paymentMethod },
      });

      // Reduce stock
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      return { createdOrder, total };
    });

    // Payment initiation (mock / ready for real API)
    const apiUrl = paymentMethod === 'telebirr' ? process.env.TELEBIRR_API_URL : process.env.CBEBIRR_API_URL;
    const apiKey = paymentMethod === 'telebirr' ? process.env.TELEBIRR_API_KEY : process.env.CBEBIRR_API_KEY;

    const paymentResponse = await axios.post(
      `${apiUrl}/initiate`,
      { orderId: order.createdOrder.id, amount: order.total, currency: 'ETB' },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    res.status(201).json({
      order: order.createdOrder,
      paymentData: paymentResponse.data,
      message: 'Order forged – Payment initiated.',
    });

  } catch (error) {
    console.error('Order creation error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    }

    res.status(500).json({ error: error.message || 'Order creation failed' });
  }
});

// --------------------
// ✅ Get all user orders
// --------------------
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;

