import { Router } from 'express';
import { schedulePrayers, getPrayers } from '../controllers/prayerController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// ✅ Schedule prayers for logged-in user
router.post('/schedule', authMiddleware, schedulePrayers);

// ✅ Get scheduled prayers for logged-in user
router.get('/', authMiddleware, getPrayers);

export default router;

