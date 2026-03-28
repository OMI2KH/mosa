const express = require('express');
const prisma = require('../lib/prisma'); // Make sure Prisma client is exported from lib/prisma.js
const { z } = require('zod');

const router = express.Router();

// --------------------
// ✅ Todo Validation Schema
// --------------------
const todoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['personal', 'group']),
  tribeId: z.number().optional(),
  userId: z.number().optional()
});

// --------------------
// ✅ Motivational Quotes
// --------------------
const velvetTruths = [
  "You know this truth: The task fears you more than you fear it. Forge ahead.",
  "Fear is the thief in your pocket—evict it, or it evicts your empire.",
  "Laziness is slumber; your soul hungers for empire. Rise.",
  "The matrix didn't fail you; it feared your wild spark. Claim it."
];

// --------------------
// ✅ Create Todo
// --------------------
router.post('/create', async (req, res) => {
  try {
    const validated = todoSchema.parse(req.body);
    const userId = req.user.userId; // Auth middleware must attach userId
    const seduction = velvetTruths[Math.floor(Math.random() * velvetTruths.length)];

    const todo = await prisma.toDo.create({
      data: {
        ...validated,
        userId,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        description: seduction + ' ' + validated.description
      }
    });

    res.status(201).json({ todo, seduction });

  } catch (error) {
    console.error('Todo creation error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors.map(e => e.message) });
    }
    res.status(500).json({ error: 'Todo creation failed' });
  }
});

// --------------------
// ✅ Get Todos
// --------------------
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const todos = await prisma.toDo.findMany({
      where: {
        OR: [
          { userId },
          { tribeId: { not: null } }
        ]
      },
      orderBy: { dueDate: 'asc' }
    });
    res.json(todos);

  } catch (error) {
    console.error('Fetch todos error:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// --------------------
// ✅ Complete Todo
// --------------------
router.patch('/complete/:id', async (req, res) => {
  try {
    const todoId = parseInt(req.params.id);
    const todo = await prisma.toDo.update({
      where: { id: todoId },
      data: { completed: true }
    });
    res.json({ todo, message: 'Task forged – Your aura strengthens.' });

  } catch (error) {
    console.error('Complete todo error:', error);
    res.status(500).json({ error: 'Todo completion failed' });
  }
});

module.exports = router;

