require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');

// Routes
const authRoutes = require('./routes/authRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const prayerRoutes = require('./routes/prayerRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const todoRoutes = require('./routes/todoRoutes');
const tribeRoutes = require('./routes/tribeRoutes');

// Middlewares
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// ----------------------------
// 🧱 GLOBAL MIDDLEWARE
// ----------------------------
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🛡️ Rate Limiter (Prevent Abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use(limiter);

// ----------------------------
// 📦 API ROUTES
// ----------------------------
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/prayers', prayerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/tribes', tribeRoutes);

// ----------------------------
// ❤️ HEALTH CHECK
// ----------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Mosa Forge Backend',
    message: 'Server is running smoothly 💪',
  });
});

// ----------------------------
// ⚠️ ERROR HANDLER
// ----------------------------
app.use(errorHandler);

// ----------------------------
// 🚀 START SERVER
// ----------------------------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Mosa Forge Backend running on http://localhost:${PORT}`);
});
