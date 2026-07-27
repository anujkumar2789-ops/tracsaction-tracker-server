const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  currency: { type: String, default: 'INR' }, // 'INR', 'USD', 'EUR', 'GBP', etc.
  language: { type: String, default: 'en' },
  isVerified: { type: Boolean, default: true },
  notificationPrefs: {
    dailyReminder: { type: Boolean, default: true },
    monthlySummary: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    billReminders: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

// Expense Schema
const expenseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  time: { type: String, default: '12:00' },
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer'],
    default: 'UPI'
  },
  description: { type: String, default: '' },
  receiptImage: { type: String, default: '' }, // base64 string or image URL
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Income Schema
const incomeSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true }, // Salary, Freelance, Gift, Business, Investment, Other
  date: { type: String, required: true }, // YYYY-MM-DD
  time: { type: String, default: '12:00' },
  description: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Custom Category Schema
const categorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['expense', 'income'], default: 'expense' },
  icon: { type: String, default: 'Tag' },
  color: { type: String, default: '#6366F1' },
  isDefault: { type: Boolean, default: false }
});

// Budget Schema
const budgetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  month: { type: String, required: true }, // YYYY-MM
  totalBudget: { type: Number, default: 0 },
  categoryBudgets: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
const Income = mongoose.models.Income || mongoose.model('Income', incomeSchema);
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Budget = mongoose.models.Budget || mongoose.model('Budget', budgetSchema);

module.exports = { User, Expense, Income, Category, Budget };
