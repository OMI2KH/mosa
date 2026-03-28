import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import axios from 'axios';

const prisma = new PrismaClient();

// Validation schemas
const orderSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  paymentMethod: z.enum(['telebirr', 'cbebirr'])
});

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  description: z.string().optional()
});

// ✅ Create a new product
export const createProduct = async (req, res) => {
  try {
    const validated = productSchema.parse(req.body);
    const product = await prisma.product.create({ data: validated });
    res.status(201).json({ product, message: 'Product added to the forge.' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Product creation failed.' });
  }
};

// ✅ Get all products
export const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
};

// ✅ Create a new order
export const createOrder = async (req, res) => {
  try {
    const { productId, quantity, paymentMethod } = orderSchema.parse(req.body);
    const userId = req.user.userId;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.stock < quantity) {
      return res.status(400).json({ error: 'Product unavailable or insufficient stock.' });
    }

    const total = product.price * quantity;
    const order = await prisma.order.create({
      data: { userId, productId, quantity, total, paymentMethod }
    });

    // Mock payment initiation
    const apiUrl = paymentMethod === 'telebirr' ? process.env.TELEBIRR_API_URL : process.env.CBEBIRR_API_URL;
    const apiKey = paymentMethod === 'telebirr' ? process.env.TELEBIRR_API_KEY : process.env.CBEBIRR_API_KEY;

    const paymentResponse = await axios.post(`${apiUrl}/initiate`, {
      orderId: order.id,
      amount: total,
      currency: 'ETB'
    }, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    // Reduce stock
    await prisma.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } }
    });

    res.status(201).json({ order, paymentData: paymentResponse.data, message: 'Order forged – Payment initiated.' });
  } catch (error) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Order creation failed.' });
  }
};

// ✅ Get all orders for logged-in user
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

// ✅ Get a single order by ID
export const getOrderById = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true, user: true }
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
};

