const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { memoryStore, saveLocalStore, getMongoStatus } = require('../store');
const { Category } = require('../models/models');

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'Utensils', color: '#F59E0B', isDefault: true, type: 'expense' },
  { name: 'Grocery', icon: 'ShoppingCart', color: '#10B981', isDefault: true, type: 'expense' },
  { name: 'Fuel', icon: 'Fuel', color: '#EF4444', isDefault: true, type: 'expense' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899', isDefault: true, type: 'expense' },
  { name: 'Travel', icon: 'Plane', color: '#3B82F6', isDefault: true, type: 'expense' },
  { name: 'Entertainment', icon: 'Film', color: '#8B5CF6', isDefault: true, type: 'expense' },
  { name: 'Education', icon: 'GraduationCap', color: '#6366F1', isDefault: true, type: 'expense' },
  { name: 'Medical', icon: 'HeartPulse', color: '#14B8A6', isDefault: true, type: 'expense' },
  { name: 'Rent', icon: 'Home', color: '#64748B', isDefault: true, type: 'expense' },
  { name: 'Bills', icon: 'Receipt', color: '#F97316', isDefault: true, type: 'expense' },
  { name: 'EMI', icon: 'CreditCard', color: '#A855F7', isDefault: true, type: 'expense' },
  { name: 'Investment', icon: 'TrendingUp', color: '#06B6D4', isDefault: true, type: 'expense' },
  { name: 'Subscription', icon: 'Tv', color: '#D946EF', isDefault: true, type: 'expense' },
  { name: 'Others', icon: 'MoreHorizontal', color: '#94A3B8', isDefault: true, type: 'expense' }
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#10B981', isDefault: true, type: 'income' },
  { name: 'Freelance', icon: 'Laptop', color: '#3B82F6', isDefault: true, type: 'income' },
  { name: 'Gift', icon: 'Gift', color: '#F59E0B', isDefault: true, type: 'income' },
  { name: 'Business', icon: 'Building', color: '#8B5CF6', isDefault: true, type: 'income' },
  { name: 'Investment', icon: 'PiggyBank', color: '#06B6D4', isDefault: true, type: 'income' },
  { name: 'Other', icon: 'Coins', color: '#64748B', isDefault: true, type: 'income' }
];

// Get categories (default + user custom)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    if (getMongoStatus()) {
      const customCats = await Category.find({ userId });
      const expenseCats = [...DEFAULT_EXPENSE_CATEGORIES, ...customCats.filter(c => c.type === 'expense')];
      const incomeCats = [...DEFAULT_INCOME_CATEGORIES, ...customCats.filter(c => c.type === 'income')];
      return res.json({ expense: expenseCats, income: incomeCats });
    } else {
      const customCats = memoryStore.categories.filter(c => c.userId === userId);
      const expenseCats = [...DEFAULT_EXPENSE_CATEGORIES, ...customCats.filter(c => c.type === 'expense')];
      const incomeCats = [...DEFAULT_INCOME_CATEGORIES, ...customCats.filter(c => c.type === 'income')];
      return res.json({ expense: expenseCats, income: incomeCats });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error fetching categories.' });
  }
});

// Add custom category
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, type = 'expense', icon = 'Tag', color = '#6366F1' } = req.body;

    if (!name) return res.status(400).json({ message: 'Category name is required.' });

    if (getMongoStatus()) {
      const newCat = new Category({
        userId,
        name,
        type,
        icon,
        color,
        isDefault: false
      });
      await newCat.save();
      return res.status(201).json(newCat);
    } else {
      const newCat = {
        id: `cat_${Date.now()}`,
        _id: `cat_${Date.now()}`,
        userId,
        name,
        type,
        icon,
        color,
        isDefault: false
      };
      memoryStore.categories.push(newCat);
      saveLocalStore();
      return res.status(201).json(newCat);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error creating category.' });
  }
});

module.exports = router;
