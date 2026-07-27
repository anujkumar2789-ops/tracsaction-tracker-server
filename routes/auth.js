const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { memoryStore, saveLocalStore, getMongoStatus } = require('../store');
const { User } = require('../models/models');

// User Registration
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, currency = 'INR', initialBalance = 0 } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const emailLower = email.toLowerCase().trim();
    const openingBalance = parseFloat(initialBalance) || 0;

    if (getMongoStatus()) {
      const existing = await User.findOne({ email: emailLower });
      if (existing) return res.status(400).json({ message: 'User with this email already exists.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        name,
        email: emailLower,
        password: hashedPassword,
        currency,
        isVerified: true
      });
      await newUser.save();

      // Create opening income if provided
      if (openingBalance > 0) {
        const { Income } = require('../models/models');
        const openingInc = new Income({
          userId: newUser._id.toString(),
          amount: openingBalance,
          category: 'Salary',
          date: new Date().toISOString().slice(0, 10),
          time: '09:00',
          description: 'Initial Opening Money'
        });
        await openingInc.save();
      }

      const token = jwt.sign({ id: newUser._id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, user: { id: newUser._id, name: newUser.name, email: newUser.email, currency: newUser.currency, isVerified: newUser.isVerified } });
    } else {
      const existing = memoryStore.users.find(u => u.email === emailLower);
      if (existing) return res.status(400).json({ message: 'User with this email already exists.' });

      const hashedPassword = bcrypt.hashSync(password, 8);
      const newId = `user_${Date.now()}`;
      const newUser = {
        id: newId,
        _id: newId,
        name,
        email: emailLower,
        password: hashedPassword,
        currency,
        language: 'en',
        isVerified: true,
        notificationPrefs: { dailyReminder: true, monthlySummary: true, budgetAlerts: true, billReminders: true },
        createdAt: new Date().toISOString()
      };
      memoryStore.users.push(newUser);

      // Create initial opening money
      if (openingBalance > 0) {
        memoryStore.income.push({
          id: `inc_${Date.now()}`,
          _id: `inc_${Date.now()}`,
          userId: newId,
          amount: openingBalance,
          category: 'Salary',
          date: new Date().toISOString().slice(0, 10),
          time: '09:00',
          description: 'Initial Opening Money',
          isDeleted: false,
          createdAt: new Date().toISOString()
        });
      }

      saveLocalStore();

      const token = jwt.sign({ id: newId, email: emailLower, name }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, user: { id: newId, name, email: emailLower, currency, isVerified: true, notificationPrefs: newUser.notificationPrefs } });
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const emailLower = email.toLowerCase().trim();

    if (getMongoStatus()) {
      const user = await User.findOne({ email: emailLower });
      if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

      const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          currency: user.currency || 'INR',
          language: user.language || 'en',
          isVerified: user.isVerified,
          notificationPrefs: user.notificationPrefs
        }
      });
    } else {
      const user = memoryStore.users.find(u => u.email === emailLower);
      if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

      const isMatch = bcrypt.compareSync(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

      const token = jwt.sign({ id: user.id || user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        token,
        user: {
          id: user.id || user._id,
          name: user.name,
          email: user.email,
          currency: user.currency || 'INR',
          language: user.language || 'en',
          isVerified: user.isVerified || true,
          notificationPrefs: user.notificationPrefs || {}
        }
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Demo Guest Auto Login
router.post('/demo', (req, res) => {
  const demoUser = memoryStore.users[0];
  const token = jwt.sign({ id: demoUser.id, email: demoUser.email, name: demoUser.name }, JWT_SECRET, { expiresIn: '30d' });
  return res.json({
    token,
    user: {
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
      currency: demoUser.currency,
      language: demoUser.language,
      isVerified: true,
      notificationPrefs: demoUser.notificationPrefs
    }
  });
});

// Forgot password link / simulation
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email address is required.' });
  res.json({ message: `Password reset link sent to ${email}. Please check your inbox.` });
});

// Verify Email simulation
router.post('/verify-email', (req, res) => {
  res.json({ message: 'Email verified successfully!' });
});

// Get profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (getMongoStatus()) {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json(user);
    } else {
      const user = memoryStore.users.find(u => (u.id || u._id) === req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update Profile & Settings
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, currency, language, notificationPrefs } = req.body;

    if (getMongoStatus()) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (name) user.name = name;
      if (currency) user.currency = currency;
      if (language) user.language = language;
      if (notificationPrefs) user.notificationPrefs = { ...user.notificationPrefs, ...notificationPrefs };
      await user.save();
      return res.json(user);
    } else {
      const userIndex = memoryStore.users.findIndex(u => (u.id || u._id) === req.user.id);
      if (userIndex === -1) return res.status(404).json({ message: 'User not found' });
      if (name) memoryStore.users[userIndex].name = name;
      if (currency) memoryStore.users[userIndex].currency = currency;
      if (language) memoryStore.users[userIndex].language = language;
      if (notificationPrefs) memoryStore.users[userIndex].notificationPrefs = { ...memoryStore.users[userIndex].notificationPrefs, ...notificationPrefs };
      saveLocalStore();
      const { password, ...userWithoutPassword } = memoryStore.users[userIndex];
      return res.json(userWithoutPassword);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Change Password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required.' });
    }

    if (getMongoStatus()) {
      const user = await User.findById(req.user.id);
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      return res.json({ message: 'Password changed successfully.' });
    } else {
      const userIndex = memoryStore.users.findIndex(u => (u.id || u._id) === req.user.id);
      const user = memoryStore.users[userIndex];
      const isMatch = bcrypt.compareSync(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });

      memoryStore.users[userIndex].password = bcrypt.hashSync(newPassword, 8);
      saveLocalStore();
      return res.json({ message: 'Password changed successfully.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Delete account
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    if (getMongoStatus()) {
      await User.findByIdAndDelete(userId);
      await Expense.deleteMany({ userId });
      await Income.deleteMany({ userId });
    } else {
      memoryStore.users = memoryStore.users.filter(u => (u.id || u._id) !== userId);
      memoryStore.expenses = memoryStore.expenses.filter(e => e.userId !== userId);
      memoryStore.income = memoryStore.income.filter(i => i.userId !== userId);
      saveLocalStore();
    }
    res.json({ message: 'Account and associated data deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting account' });
  }
});

module.exports = router;
