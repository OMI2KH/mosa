import { Router } from 'express';
import { getProfile, updateProfile, getStats, deleteUser } from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// ✅ Get logged-in user's profile
router.get('/profile', authMiddleware, getProfile);

// ✅ Update logged-in user's profile
router.patch('/profile', authMiddleware, updateProfile);

// ✅ Get user stats (todos, lessons, tribes)
router.get('/stats', authMiddleware, getStats);

// ✅ Delete user account
router.delete('/', authMiddleware, deleteUser);

export default router;

