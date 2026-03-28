import { Router } from 'express';
import { createOrder, getOrders } from '../controllers/orderController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// ✅ Create a new order (protected)
router.post('/', authMiddleware, createOrder);

// ✅ Get all orders of logged-in user (protected)
router.get('/', authMiddleware, getOrders);

export default router;
