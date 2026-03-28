import { Router } from 'express';
import { getLessons } from '../controllers/lessonController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// ✅ Get all lessons (protected)
router.get('/', authMiddleware, getLessons);

export default router;

