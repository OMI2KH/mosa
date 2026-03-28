import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// ----------------------
// Sample Lessons for Each Venture
// ----------------------

const lessonsData = {
  mosa: [
    {
      title: 'Make First ETB 100',
      content: 'Start small, think big. Sell one item today and log your win.',
      type: 'money',
      xp: 50,
      isGroup: false
    },
    {
      title: 'Preserve Your Spark',
      content: 'Save ETB 50, start a vault, watch your wealth grow.',
      type: 'preserve',
      xp: 40,
      isGroup: false
    },
    {
      title: 'Multiply: 100 to 1,000',
      content: 'Reinvest your earnings, track growth, learn compounding.',
      type: 'multiply',
      xp: 60,
      isGroup: true
    },
    {
      title: 'Carpentry Basics',
      content: 'Learn how to make furniture and wooden items to sell.',
      type: 'skill',
      xp: 30,
      isGroup: false
    },
    {
      title: 'Plumbing Essentials',
      content: 'Basic plumbing repairs and installations for clients.',
      type: 'skill',
      xp: 30,
      isGroup: false
    },
    {
      title: 'Painting & Finishing',
      content: 'Master walls, ceilings, and finishing touches.',
      type: 'skill',
      xp: 30,
      isGroup: false
    },
    {
      title: 'Furniture Making',
      content: 'Craft custom furniture for clients, earn extra income.',
      type: 'skill',
      xp: 40,
      isGroup: false
    },
    {
      title: 'Digital Marketing Basics',
      content: 'Promote your skills online, reach clients faster.',
      type: 'skill',
      xp: 35,
      isGroup: false
    },
    {
      title: 'Forex Trading Basics',
      content: 'Learn how to trade forex safely and wisely.',
      type: 'trading',
      xp: 50,
      isGroup: false
    },
    {
      title: 'Freelancing Online',
      content: 'Create online profiles and sell your skills digitally.',
      type: 'skill',
      xp: 35,
      isGroup: true
    }
  ],

  yachi: [
    { title: 'Carpentry Services', content: 'Provide carpentry services to clients.', type: 'home', xp: 30, isGroup: false },
    { title: 'Plumbing Services', content: 'Provide plumbing services to clients.', type: 'home', xp: 30, isGroup: false },
    { title: 'Electrical Repairs', content: 'Install and repair home wiring.', type: 'home', xp: 35, isGroup: false },
    { title: 'Painting Projects', content: 'Paint walls and finish ceilings professionally.', type: 'home', xp: 30, isGroup: false },
    { title: 'Furniture Installation', content: 'Assemble and install furniture.', type: 'home', xp: 35, isGroup: false },
    { title: 'Tiling & Flooring', content: 'Lay tiles and floors for homes.', type: 'home', xp: 40, isGroup: false },
    { title: 'Roofing Repairs', content: 'Repair and maintain roofs.', type: 'home', xp: 40, isGroup: false },
    { title: 'Masonry Work', content: 'Brick, cement, and stone work.', type: 'home', xp: 40, isGroup: false },
    { title: 'Interior Decor', content: 'Design and improve interior spaces.', type: 'home', xp: 35, isGroup: false },
    { title: 'Gardening & Landscaping', content: 'Beautify gardens and outdoor areas.', type: 'home', xp: 30, isGroup: false },
    { title: 'Glass Installation', content: 'Install windows and glass doors.', type: 'home', xp: 30, isGroup: false },
    { title: 'Kitchen Remodeling', content: 'Upgrade kitchens for clients.', type: 'home', xp: 35, isGroup: false },
    { title: 'Door & Window Installation', content: 'Install doors and windows correctly.', type: 'home', xp: 30, isGroup: false },
    { title: 'Small Renovations', content: 'Handle minor home renovation tasks.', type: 'home', xp: 30, isGroup: false },
    { title: 'Home Automation', content: 'Install smart devices in homes.', type: 'home', xp: 40, isGroup: false },
    { title: 'Solar Panel Installation', content: 'Set up solar panels for households.', type: 'home', xp: 45, isGroup: false },
    { title: 'HVAC Installation', content: 'Install heating and cooling systems.', type: 'home', xp: 45, isGroup: false },
    { title: 'Welding & Metalwork', content: 'Create metal structures and repairs.', type: 'home', xp: 40, isGroup: false },
    { title: 'Handyman Quick Fixes', content: 'Perform quick home repairs.', type: 'home', xp: 30, isGroup: false },
    { title: 'Service Marketing', content: 'Learn to market your services effectively.', type: 'home', xp: 35, isGroup: true },
    { title: 'Pool Maintenance', content: 'Maintain residential swimming pools.', type: 'home', xp: 35, isGroup: false },
    { title: 'Outdoor Structures', content: 'Build patios, pergolas, and decks.', type: 'home', xp: 40, isGroup: false },
    { title: 'Wall & Ceiling Repairs', content: 'Fix walls and ceilings professionally.', type: 'home', xp: 35, isGroup: false },
    { title: 'Electrical Safety Compliance', content: 'Follow safety rules for electrical works.', type: 'home', xp: 30, isGroup: false },
    { title: 'Home Cleaning & Maintenance', content: 'Keep homes clean and maintained.', type: 'home', xp: 30, isGroup: false },
    { title: 'Custom Furniture Design', content: 'Create unique furniture designs.', type: 'home', xp: 40, isGroup: false },
    { title: 'Painting Techniques', content: 'Advanced painting skills for professionals.', type: 'home', xp: 35, isGroup: false },
    { title: 'Client Communication', content: 'Effectively communicate with clients.', type: 'home', xp: 30, isGroup: true },
    { title: 'Time Management', content: 'Manage multiple projects efficiently.', type: 'home', xp: 35, isGroup: true },
    { title: 'Pricing & Negotiation', content: 'Price services correctly and negotiate deals.', type: 'home', xp: 35, isGroup: true }
  ],

  chereka: [
    { title: 'Graphic Design Basics', content: 'Learn visual design fundamentals.', type: 'creative', xp: 30, isGroup: false },
    { title: 'Logo Design Mastery', content: 'Create logos for brands and clients.', type: 'creative', xp: 35, isGroup: false },
    { title: 'Web Design (Framer)', content: 'Design interactive websites using Framer.', type: 'creative', xp: 40, isGroup: false },
    { title: 'Webflow Projects', content: 'Build websites using Webflow platform.', type: 'creative', xp: 40, isGroup: false },
    { title: 'Digital Marketing', content: 'Promote brands online effectively.', type: 'creative', xp: 35, isGroup: true },
    { title: 'Portfolio Creation', content: 'Showcase your work and attract clients.', type: 'creative', xp: 30, isGroup: false },
    { title: 'Freelance Client Work', content: 'Take real projects and earn XP.', type: 'creative', xp: 40, isGroup: true },
    { title: 'Brand Storytelling', content: 'Craft powerful narratives for brands.', type: 'creative', xp: 35, isGroup: false },
    { title: 'UI/UX Design', content: 'Improve user experience and interface design.', type: 'creative', xp: 40, isGroup: false },
    { title: 'Social Media Campaigns', content: 'Create campaigns that convert.', type: 'creative', xp: 35, isGroup: true }
  ],

  sifr: [
    { title: 'Python Programming', content: 'Learn Python for automation and AI.', type: 'tech', xp: 40, isGroup: false },
    { title: 'Robotics Basics', content: 'Build and program basic robots.', type: 'tech', xp: 45, isGroup: false },
    { title: 'Machine Learning Intro', content: 'Train ML models for real problems.', type: 'tech', xp: 45, isGroup: false },
    { title: 'AI Ethics', content: 'Understand ethical AI practices.', type: 'tech', xp: 35, isGroup: false },
    { title: 'Deep Learning', content: 'Create neural networks with TensorFlow/PyTorch.', type: 'tech', xp: 50, isGroup: false },
    { title: 'Web Development', content: 'Build full-stack web apps.', type: 'tech', xp: 40, isGroup: false },
    { title: 'IoT Projects', content: 'Create smart connected devices.', type: 'tech', xp: 45, isGroup: false },
    { title: 'AI Product Design', content: 'Design AI-powered products for users.', type: 'tech', xp: 40, isGroup: true },
    { title: 'Robotics Projects', content: 'Advanced robotics tasks and integration.', type: 'tech', xp: 50, isGroup: true },
    { title: 'Forex Trading', content: 'Learn advanced forex trading strategies.', type: 'trading', xp: 45, isGroup: false }
  ],

  azmera: [
    { title: 'Family Bonding', content: 'Strengthen relationships with family.', type: 'relationships', xp: 30, isGroup: false },
    { title: 'Love & Emotional Intelligence', content: 'Learn to manage emotions in love.', type: 'relationships', xp: 35, isGroup: false },
    { title: 'Positive Friendships', content: 'Build a strong, positive circle.', type: 'relationships', xp: 35, isGroup: true },
    { title: 'Conflict Resolution', content: 'Resolve disputes peacefully.', type: 'relationships', xp: 30, isGroup: false },
    { title: 'Dating & Courtship', content: 'Understand healthy relationships (Islamic-friendly).', type: 'relationships', xp: 35, isGroup: false },
    { title: 'Social Circle Alignment', content: 'Align your circle with your values.', type: 'relationships', xp: 35, isGroup: true },
    { title: 'Mentorship & Influence', content: 'Learn to guide others positively.', type: 'relationships', xp: 40, isGroup: true }
  ]
};

// ----------------------
// Seed Function
// ----------------------

const seedLessons = async () => {
  try {
    for (const venture in lessonsData) {
      for (const lesson of lessonsData[venture]) {
        await prisma.lesson.upsert({
          where: { title: lesson.title },
          update: {},
          create: { ...lesson, venture }
        });
      }
    }
    console.log('✅ Lessons seeded successfully');
  } catch (err) {
    console.error('❌ Error seeding lessons:', err);
  }
};

// ----------------------
// GET Lessons Endpoint
// ----------------------

router.get('/', async (req, res) => {
  try {
    const lessons = await prisma.lesson.findMany();
    if (!lessons.length) {
      await seedLessons();
      return res.json({ message: 'Lessons seeded', lessons: lessonsData });
    }
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

export default router;
