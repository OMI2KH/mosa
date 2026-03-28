import { Router } from 'express';
import { getGamification, updateGamification } from '../controllers/gamificationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// ✅ Get current user's gamification stats (xp, streak, etc.)
router.get('/', authMiddleware, getGamification);

// ✅ Update gamification manually if needed
router.patch('/', authMiddleware, updateGamification);

export default router;

