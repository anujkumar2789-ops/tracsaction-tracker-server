const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { memoryStore, saveLocalStore, getMongoStatus } = require('../store');
const { Category } = require('../models/models');

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'Utensils', color: '#F59E0B', isDefault: true, type: 'expense', keywords: ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'coffee', 'chai', 'tea', 'swiggy', 'zomato', 'snack', 'snacks', 'burger', 'pizza', 'biryani', 'hotel', 'bistro', 'mcdonalds', 'dominos', 'kfc', 'bakery', 'sweets', 'dhaba'] },
  { name: 'Grocery', icon: 'ShoppingCart', color: '#10B981', isDefault: true, type: 'expense', keywords: ['grocery', 'groceries', 'supermarket', 'blinkit', 'zepto', 'instamart', 'vegetables', 'fruits', 'milk', 'sabzi', 'kirana', 'provisions', 'dmart', 'nature basket', 'reliance fresh', 'spencer'] },
  { name: 'Fuel', icon: 'Fuel', color: '#EF4444', isDefault: true, type: 'expense', keywords: ['fuel', 'petrol', 'diesel', 'cng', 'gas', 'hp', 'hpcl', 'indian oil', 'iocl', 'bharat petroleum', 'bpcl', 'shell', 'pump'] },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899', isDefault: true, type: 'expense', keywords: ['shopping', 'clothes', 'shoes', 'amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'mall', 'purchase', 'apparel', 'electronics'] },
  { name: 'Travel', icon: 'Plane', color: '#3B82F6', isDefault: true, type: 'expense', keywords: ['travel', 'trip', 'flight', 'train', 'ticket', 'uber', 'ola', 'rapido', 'taxi', 'cab', 'bus', 'metro', 'toll', 'fastag', 'auto', 'irctc', 'redbus', 'makemytrip', 'indigo'] },
  { name: 'Entertainment', icon: 'Film', color: '#8B5CF6', isDefault: true, type: 'expense', keywords: ['entertainment', 'movie', 'cinema', 'pvr', 'inox', 'bookmyshow', 'netflix', 'spotify', 'hotstar', 'prime video', 'game', 'gaming', 'concert', 'party', 'club'] },
  { name: 'Education', icon: 'GraduationCap', color: '#6366F1', isDefault: true, type: 'expense', keywords: ['education', 'book', 'books', 'course', 'fees', 'tuition', 'school', 'college', 'exam', 'class', 'stationery', 'udemy', 'coursera'] },
  { name: 'Medical', icon: 'HeartPulse', color: '#14B8A6', isDefault: true, type: 'expense', keywords: ['medical', 'medicine', 'medicines', 'doctor', 'hospital', 'pharmacy', 'chemist', 'clinic', 'tablet', 'health', 'apollo', 'pharmeasy', '1mg', 'medplus', 'test', 'lab'] },
  { name: 'Rent', icon: 'Home', color: '#64748B', isDefault: true, type: 'expense', keywords: ['rent', 'house rent', 'flat rent', 'room rent', 'landlord', 'society maintenance'] },
  { name: 'Bills', icon: 'Receipt', color: '#F97316', isDefault: true, type: 'expense', keywords: ['bill', 'bills', 'electricity', 'water', 'wifi', 'broadband', 'recharge', 'jio', 'airtel', 'vi', 'vodafone', 'utility', 'piped gas', 'dth', 'tata play'] },
  { name: 'EMI', icon: 'CreditCard', color: '#A855F7', isDefault: true, type: 'expense', keywords: ['emi', 'loan', 'installment', 'credit card', 'credit card bill', 'card payment', 'hdfc bank emi', 'sbi card'] },
  { name: 'Investment', icon: 'TrendingUp', color: '#06B6D4', isDefault: true, type: 'expense', keywords: ['investment', 'stocks', 'mutual fund', 'sip', 'zerodha', 'groww', 'crypto', 'gold', 'shares', 'trading'] },
  { name: 'Subscription', icon: 'Tv', color: '#D946EF', isDefault: true, type: 'expense', keywords: ['subscription', 'membership', 'gym', 'apple', 'google play', 'youtube premium', 'chatgpt', 'cloud storage', 'renewal'] },
  { name: 'Others', icon: 'MoreHorizontal', color: '#94A3B8', isDefault: true, type: 'expense', keywords: ['others', 'other', 'cash', 'misc', 'miscellaneous', 'donation'] }
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
    const { name, type = 'expense', icon = 'Tag', color = '#6366F1', keywords = [] } = req.body;

    if (!name) return res.status(400).json({ message: 'Category name is required.' });

    const parsedKeywords = Array.isArray(keywords)
      ? keywords.map(k => String(k).trim().toLowerCase()).filter(Boolean)
      : (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) : []);

    if (getMongoStatus()) {
      const newCat = new Category({
        userId,
        name,
        type,
        icon,
        color,
        keywords: parsedKeywords,
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
        keywords: parsedKeywords,
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

// Update category (including custom keywords)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const catId = req.params.id;
    const { name, icon, color, keywords } = req.body;

    const parsedKeywords = keywords !== undefined
      ? (Array.isArray(keywords)
          ? keywords.map(k => String(k).trim().toLowerCase()).filter(Boolean)
          : String(keywords).split(',').map(k => k.trim().toLowerCase()).filter(Boolean))
      : undefined;

    if (getMongoStatus()) {
      const cat = await Category.findOne({ _id: catId, userId });
      if (!cat) return res.status(404).json({ message: 'Category not found.' });

      if (name) cat.name = name;
      if (icon) cat.icon = icon;
      if (color) cat.color = color;
      if (parsedKeywords !== undefined) cat.keywords = parsedKeywords;

      await cat.save();
      return res.json(cat);
    } else {
      const index = memoryStore.categories.findIndex(c => (c.id === catId || c._id === catId) && c.userId === userId);
      if (index === -1) return res.status(404).json({ message: 'Category not found.' });

      if (name) memoryStore.categories[index].name = name;
      if (icon) memoryStore.categories[index].icon = icon;
      if (color) memoryStore.categories[index].color = color;
      if (parsedKeywords !== undefined) memoryStore.categories[index].keywords = parsedKeywords;

      saveLocalStore();
      return res.json(memoryStore.categories[index]);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating category.' });
  }
});

// Delete custom category
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const catId = req.params.id;

    if (getMongoStatus()) {
      await Category.deleteOne({ _id: catId, userId });
    } else {
      memoryStore.categories = memoryStore.categories.filter(c => !((c.id === catId || c._id === catId) && c.userId === userId));
      saveLocalStore();
    }
    res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting category.' });
  }
});

module.exports = router;
