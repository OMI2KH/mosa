import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Update user XP and streak based on login activity
 * @param {number} userId
 */
export const updateGamification = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const now = new Date();
  const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;

  let streak = user.streak || 0;
  let xp = user.xp || 0;

  if (lastLogin) {
    const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak += 1;
      xp += 10; // daily streak bonus
    } else if (diffDays > 1) {
      streak = 1; // reset streak if missed a day
    }
  } else {
    streak = 1; // first login
    xp += 10;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { streak, xp, lastLogin: now }
  });

  return { streak: updatedUser.streak, xp: updatedUser.xp };
};

/**
 * Add XP to user manually (e.g., completing a task or achievement)
 * @param {number} userId
 * @param {number} points
 */
export const addXp = async (userId, points) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { xp: (user.xp || 0) + points }
  });

  return { xp: updatedUser.xp };
};

/**
 * Track user achievements
 * @param {number} userId
 * @param {string} achievement
 */
export const addAchievement = async (userId, achievement) => {
  const newAchievement = await prisma.achievement.create({
    data: { userId, name: achievement }
  });
  return newAchievement;
};

/**
 * Fetch user gamification stats
 * @param {number} userId
 */
export const getGamificationStats = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { achievements: true }
  });

  if (!user) throw new Error('User not found');

  return {
    streak: user.streak,
    xp: user.xp,
    achievements: user.achievements
  };
};
