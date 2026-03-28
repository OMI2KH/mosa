/**
 * 🌍 MOSA FORGE DATABASE SEEDER
 * Purpose: Initialize the database with default users, lessons, and prayer routines.
 * Tone: Discipline. Faith. Execution.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('\n⚙️  Seeding Mosa Forge database...');

  // --- USERS ---
  const users = [
    { email: 'legend@ethiopia.com', password: 'Legend123!', name: 'Legend' },
    { email: 'dropout@forge.com', password: 'Dropout123!', name: 'Dropout' }
  ];

  for (const user of users) {
    const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: { ...user, password: hashedPassword }
      });
      console.log(`🔥 Created user: ${user.name}`);
    } else {
      console.log(`⚠️  User already exists: ${user.name}`);
    }
  }

  // --- LESSONS ---
  const lessons = [
    {
      title: 'Steal Like an Artist: Remix Wealth',
      content:
        "Ideas are borrowed—steal from Merkato's masters, remix for your tribe's empire.",
      type: 'creativity',
      isGroup: true
    },
    {
      title: 'Making Money: First ETB 100',
      content: 'Sell one thing you own today. Log the win: What did you create from nothing?',
      type: 'money',
      isGroup: false
    },
    {
      title: 'Sales Persuasion: Weave the Word',
      content: 'Fear says "no"—you say "yes, because...". Practice your pitch in the tribe mirror.',
      type: 'sales',
      isGroup: true
    },
    {
      title: 'Multiply: From 100 to 1,000',
      content: 'One seed, ten fruits—barter your win with the tribe, watch it compound.',
      type: 'multiply',
      isGroup: true
    },
    {
      title: 'Scale the Spark: Tribe Empire',
      content:
        'Your gig is a flame—fan it with tribe roles: Who sells? Who creates? Assign and execute.',
      type: 'scale',
      isGroup: true
    },
    {
      title: 'Invest: Preserve the Flame',
      content: 'Gold sleeps, wealth wakes—put ETB 50 in a shared vault, let time forge it.',
      type: 'invest',
      isGroup: false
    },
    {
      title: 'Communicate: Aura Accords',
      content:
        'Words are weapons—forge agreements that bind, not break. Resolve one tribe tension with a "yes, and..." pact.',
      type: 'comms',
      isGroup: true
    }
  ];

  for (const lesson of lessons) {
    await prisma.lesson.upsert({
      where: { title: lesson.title },
      update: {},
      create: lesson
    });
  }

  console.log(`📘 Seeded ${lessons.length} lessons.`);

  // --- PRAYERS ---
  const prayerTimes = [
    { name: 'Fajr', time: '05:00 AM', reminder: 'Non-negotiable: Fajr – Allah first.' },
    { name: 'Dhuhr', time: '12:00 PM', reminder: 'Pause the hustle, bow to the Divine.' },
    { name: 'Asr', time: '03:30 PM', reminder: 'Midday reflection in the forge.' },
    { name: 'Maghrib', time: '06:00 PM', reminder: "Sunset gratitude for the day's sparks." },
    { name: 'Isha', time: '07:30 PM', reminder: "Night's vow to rise renewed." }
  ];

  const allUsers = await prisma.user.findMany();
  for (const user of allUsers) {
    for (const prayer of prayerTimes) {
      await prisma.prayer.upsert({
        where: {
          userId_name: { userId: user.id, name: prayer.name } // Use compound unique if exists
        },
        update: {},
        create: { userId: user.id, ...prayer }
      });
    }
  }

  console.log(`🕌 Prayers assigned to ${allUsers.length} users.`);
  console.log('\n✅ Seeding completed successfully!');
}

// --- EXECUTE SEED ---
main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

