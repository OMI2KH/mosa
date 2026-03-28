import { Router } from 'express';
import { createTribe, upgradeLevel, getTribes } from '../controllers/tribeController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// ✅ Create a new tribe
router.post('/create', authMiddleware, createTribe);

// ✅ Upgrade tribe level
router.post('/:id/upgrade', authMiddleware, upgradeLevel);

// ✅ Fetch all tribes
router.get('/', authMiddleware, getTribes);

export default router;

