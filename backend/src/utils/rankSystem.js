const prisma = require('../lib/prisma');

// Define rank levels
const levels = [
  { name: 'Novice', minXP: 0 },
  { name: 'Apprentice', minXP: 100 },
  { name: 'Warrior', minXP: 250 },
  { name: 'Champion', minXP: 500 },
  { name: 'Legend', minXP: 1000 },
  { name: 'Mythic', minXP: 2000 },
];

// === Calculate current rank based on XP ===
const getRank = (xp) => {
  let current = levels[0];
  for (const level of levels) {
    if (xp >= level.minXP) current = level;
  }
  return current;
};

// === Add XP to a user ===
const addXP = async (userId, amount) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found.');

  const newXP = (user.xp || 0) + amount;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { xp: newXP },
  });

  const rank = getRank(newXP);
  return { xp: newXP, rank: rank.name };
};

// === Fetch user rank info ===
const getUserRank = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found.');

  const rank = getRank(user.xp || 0);
  return { xp: user.xp || 0, rank: rank.name };
};

// === Optional: Rank leaderboard ===
const getLeaderboard = async (limit = 10) => {
  const users = await prisma.user.findMany({
    orderBy: { xp: 'desc' },
    take: limit,
    select: { id: true, name: true, xp: true },
  });

  return users.map((u, idx) => ({
    position: idx + 1,
    id: u.id,
    name: u.name,
    xp: u.xp,
    rank: getRank(u.xp).name,
  }));
};

module.exports = {
  getRank,
  addXP,
  getUserRank,
  getLeaderboard,
};
