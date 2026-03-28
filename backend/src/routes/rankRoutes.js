const { Router } = require('express');
const {
  getUserRank,
  addXP,
  getLeaderboard,
} = require('../controllers/rankController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = Router();

// Get current user's rank
router.get('/', authMiddleware, getUserRank);

// Add XP to current user
router.post('/add', authMiddleware, addXP);

// Get top users leaderboard
router.get('/leaderboard', authMiddleware, getLeaderboard);

module.exports = router;
