const { Router } = require('express');
const { getGamification, updateGamification } = require('../controllers/gamificationController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();

// ✅ Get current user's gamification stats (XP, streak, level, etc.)
router.get('/', authMiddleware, getGamification);

// ✅ Update gamification manually (if needed)
router.patch('/', authMiddleware, updateGamification);

module.exports = router;
