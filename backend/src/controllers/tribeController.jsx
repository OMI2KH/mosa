import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = express.Router();

// --------------------
// ✅ Tribe Validation Schema
// --------------------
const tribeSchema = z.object({
  userIds: z.array(z.number()),
  location: z.object({ lat: z.number(), lng: z.number() })
});

// --------------------
// ✅ Aura Names Pool
// --------------------
const auraNames = [
  'Lions Aura',
  'Phoenix Quill',
  'Ember Collective',
  'Veilbreaker Horizon',
  'Flame Syndicate'
];

// --------------------
// ✅ Create Tribe
// --------------------
router.post('/create', async (req, res) => {
  try {
    const { userIds, location } = tribeSchema.parse(req.body);

    if (userIds.length !== 30) {
      return res.status(400).json({ error: 'Tribe must have exactly 30 members' });
    }

    const name = auraNames[Math.floor(Math.random() * auraNames.length)];

    const tribe = await prisma.tribe.create({
      data: {
        name,
        location,
        members: { connect: userIds.map(id => ({ id })) }
      },
      include: { members: true }
    });

    // Update users with tribeId
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { tribeId: tribe.id }
    });

    res.status(201).json({ tribe, message: `Aura christened: ${name}. Forge your legend.` });

  } catch (error) {
    console.error('Tribe creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors.map(e => e.message) });
    }
    res.status(500).json({ error: 'Tribe creation failed' });
  }
});

// --------------------
// ✅ Upgrade Tribe Level
// --------------------
router.patch('/upgrade/:id', async (req, res) => {
  try {
    const tribeId = parseInt(req.params.id);

    const { businessName, proof } = z.object({
      businessName: z.string().min(1),
      proof: z.string().min(1)
    }).parse(req.body);

    const currentTribe = await prisma.tribe.findUnique({ where: { id: tribeId } });
    if (!currentTribe) return res.status(404).json({ error: 'Tribe not found' });

    const levels = ['Ember', 'Flame', 'Inferno'];
    const currentIndex = levels.indexOf(currentTribe.level || 'Ember');
    const nextLevel = levels[currentIndex + 1] || 'Inferno';

    const tribe = await prisma.tribe.update({
      where: { id: tribeId },
      data: { level: nextLevel, business: businessName },
      include: { members: true }
    });

    const tiktokTitle = `${tribe.name} Scales to ${nextLevel} – Dropout Dynasty Rises! #MosaForge #EthiopiaRevolution`;

    res.json({ tribe, tiktokTitle, message: 'Level up confirmed. Aura goes viral.' });

  } catch (error) {
    console.error('Tribe upgrade error:', error);
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors.map(e => e.message) });
    res.status(500).json({ error: 'Level upgrade failed' });
  }
});

// --------------------
// ✅ Get All Tribes
// --------------------
router.get('/', async (req, res) => {
  try {
    const tribes = await prisma.tribe.findMany({
      include: {
        members: {
          select: { id: true, name: true, archetype: true }
        }
      }
    });
    res.json(tribes);
  } catch (error) {
    console.error('Fetch tribes error:', error);
    res.status(500).json({ error: 'Failed to fetch tribes' });
  }
});

export default router;

