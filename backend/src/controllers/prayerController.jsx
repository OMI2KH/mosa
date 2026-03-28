const express = require('express');
const prisma = require('../lib/prisma'); // ensure prisma client is exported from lib/prisma.js

const router = express.Router();

// --------------------
// ✅ Prayer Times Data
// --------------------
const prayerTimes = {
  Islam: [
    { time: '05:00', name: 'Fajr', reminder: 'Non-negotiable: Fajr – Allah first, forge second.' },
    { time: '12:00', name: 'Dhuhr', reminder: 'Non-negotiable: Dhuhr – Pause the hustle, bow to the Divine.' },
    { time: '15:30', name: 'Asr', reminder: 'Non-negotiable: Asr – Midday reflection in the forge.' },
    { time: '18:00', name: 'Maghrib', reminder: 'Non-negotiable: Maghrib – Sunset gratitude for the day\'s sparks.' },
    { time: '19:30', name: 'Isha', reminder: 'Non-negotiable: Isha – Night\'s vow to rise renewed.' }
  ],
  Orthodox: [
    { time: '06:00', name: 'Morning Matins', reminder: 'Invoke the flame: Morning gratitude for the day\'s forge.' },
    { time: '20:00', name: 'Evening Vespers', reminder: 'Sanctuary close: Preserve today\'s wins in reflection.' }
  ],
  Other: [
    { time: '06:00', name: 'Dawn Gratitude', reminder: 'Invoke the flame: Morning gratitude for the day\'s forge.' },
    { time: '20:00', name: 'Twilight Reflection', reminder: 'Sanctuary close: Preserve today\'s wins in reflection.' }
  ]
};

// --------------------
// ✅ Schedule Prayers
// --------------------
router.post('/schedule', async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.religion) {
      return res.status(400).json({ error: 'Religion not specified in survey' });
    }

    const times = prayerTimes[user.religion] || prayerTimes.Other;
    const prayers = [];

    for (const { time, name, reminder } of times) {
      // Avoid duplicates
      const existing = await prisma.prayer.findFirst({ where: { userId, name, time } });
      if (!existing) {
        const prayer = await prisma.prayer.create({
          data: { userId, time, reminder, name }
        });
        prayers.push(prayer);
      }
    }

    res.json({ prayers, message: 'Faith anchors the forge – Prayers scheduled.' });
  } catch (error) {
    console.error('Prayer scheduling error:', error);
    res.status(500).json({ error: 'Prayer scheduling failed' });
  }
});

// --------------------
// ✅ Get User Prayers
// --------------------
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const prayers = await prisma.prayer.findMany({
      where: { userId },
      orderBy: { time: 'asc' }
    });

    res.json(prayers);
  } catch (error) {
    console.error('Fetch prayers error:', error);
    res.status(500).json({ error: 'Failed to fetch prayers' });
  }
});

module.exports = router;

