const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  referralCode: z.string().optional(),
  religion: z.string().optional(),
  surveyData: z.object({ skills: z.string(), passions: z.string(), risk: z.string() }).optional()
});

// REGISTER
router.post('/user/register', async (req, res) => {
  try {
    const { email, password, name, referralCode, religion, surveyData } = userSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    let archetype = surveyData ? (surveyData.risk === 'high' ? 'Creator Spark' : surveyData.risk === 'medium' ? 'Multiplier Flame' : 'Preserver Ember') : null;

    const newUser = await prisma.user.create({ data: { email, password: hashed, name, religion, surveyData, archetype } });

    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { id: parseInt(referralCode) } });
      if (referrer) {
        await prisma.referral.create({ data: { userId: referrer.id, referredId: newUser.id } });
        await prisma.user.update({ where: { id: referrer.id }, data: { credits: { increment: 50 }, xp: { increment: 25 } } });
      }
    }

    const tokens = generateTokens(newUser.id);
    await updateUserGamification(newUser);

    res.status(201).json({ message: 'Registration successful', token: tokens.token, refreshToken: tokens.refreshToken, user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN
router.post('/user/login', async (req, res) => {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' });

    const tokens = generateTokens(user.id);
    const gamification = await updateUserGamification(user);

    res.json({ message: 'Login successful', token: tokens.token, refreshToken: tokens.refreshToken, user: { ...user, streak: gamification.streak, xp: gamification.xp } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// REFRESH TOKEN
router.post('/user/refresh', async (req, res) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) return res.status(401).json({ error: 'Invalid refresh token' });
    const token = generateTokens(decoded.userId).token;
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET PROFILE
router.get('/user/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// UPDATE PROFILE
router.patch('/user/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    const updated = await prisma.user.update({ where: { id: userId }, data: req.body });
    res.json({ user: updated, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE USER
router.delete('/user', async (req, res) => {
  try {
    const userId = req.user.userId;
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
