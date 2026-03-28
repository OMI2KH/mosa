const rankService = require('../services/rankSystem');

// === Get current user rank info ===
const getUserRank = async (req, res) => {
  try {
    const userId = req.user.userId;
    const rankInfo = await rankService.getUserRank(userId);
    res.json({ message: 'User rank retrieved successfully.', rankInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// === Add XP to a user ===
const addXP = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid XP amount.' });
    }

    const result = await rankService.addXP(userId, amount);
    res.json({ message: `Gained ${amount} XP!`, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// === Get leaderboard ===
const getLeaderboard = async (req, res) => {
  try {
    const { limit } = req.query;
    const leaderboard = await rankService.getLeaderboard(limit ? parseInt(limit) : 10);
    res.json({ message: 'Leaderboard retrieved successfully.', leaderboard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUserRank,
  addXP,
  getLeaderboard,
};
