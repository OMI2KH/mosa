import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = express.Router();

// --------------------
// ✅ User Schema
// --------------------
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  referralCode: z.string().optional(),
  religion: z.string().optional(),
  surveyData: z
    .object({
      skills: z.string(),
      passions: z.string(),
      risk: z.string(),
    })
    .optional(),
});

// --------------------
// ✅ Token Helpers
// --------------------
const generateTokens = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_SECRET, { expiresIn: '7d' });
  return { token, refreshToken };
};

// --------------------
// ✅ Gamification: XP & Streak
// --------------------
const updateUserGamification = async (user) => {
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
      streak = 1; // reset streak
    }
  } else {
    streak = 1;
    xp += 10; // first login bonus
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { streak, xp, lastLogin: now },
  });

  return { streak, xp };
};

// --------------------
// ✅ REGISTER
// --------------------
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, referralCode, religion, surveyData } = userSchema.parse(req.body);

    // check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    let archetype = null;
    if (surveyData) {
      archetype =
        surveyData.risk === 'high'
          ? 'Creator Spark'
          : surveyData.risk === 'medium'
          ? 'Multiplier Flame'
          : 'Preserver Ember';
    }

    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, name, religion, surveyData, archetype },
    });

    // ✅ Referral bonus
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { id: parseInt(referralCode) } });
      if (referrer) {
        await prisma.referral.create({ data: { userId: referrer.id, referredId: newUser.id } });
        await prisma.user.update({
          where: { id: referrer.id },
          data: { credits: { increment: 50 }, xp: { increment: 25 } },
        });
      }
    }

    const { token, refreshToken } = generateTokens(newUser.id);
    await updateUserGamification(newUser);

    res.status(201).json({
      message: 'Registration successful',
      token,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name,
        credits: newUser.credits,
        religion,
        archetype,
      },
    });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors.map((e) => e.message) });
    res.status(500).json({ error: 'Registration failed. Try again later.' });
  }
});

// --------------------
// ✅ LOGIN
// --------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { token, refreshToken } = generateTokens(user.id);
    const gamification = await updateUserGamification(user);

    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        email,
        name: user.name,
        credits: user.credits,
        religion: user.religion,
        archetype: user.archetype,
        xp: gamification.xp,
        streak: gamification.streak,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// --------------------
// ✅ REFRESH TOKEN
// --------------------
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const { token } = generateTokens(decoded.userId);
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
