import { Router } from 'express';
import { createSubscription, getSubscription } from '../controllers/subscriptionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// ✅ Create a new subscription
router.post('/create', authMiddleware, createSubscription);

// ✅ Get current user's subscription
router.get('/', authMiddleware, getSubscription);

export default router;

