const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { User, Expense, Income, Category, Budget } = require('./models/models');

const DATA_FILE = path.join(__dirname, 'data_store.json');

// In-Memory store initial template
let memoryStore = {
  users: [
    {
      id: 'demo_user_123',
      _id: 'demo_user_123',
      name: 'Demo User',
      email: 'demo@expensify.com',
      password: bcrypt.hashSync('demo123', 8),
      currency: 'INR',
      language: 'en',
      isVerified: true,
      notificationPrefs: {
        dailyReminder: true,
        monthlySummary: true,
        budgetAlerts: true,
        billReminders: true
      },
      createdAt: new Date().toISOString()
    }
  ],
  expenses: [],
  income: [],
  categories: [],
  budgets: []
};

// Seed demo data for demo_user_123
function seedDemoData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthStr = `${year}-${month}`;

  const currentDaysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();

  memoryStore.budgets.push({
    id: `b_${monthStr}`,
    _id: `b_${monthStr}`,
    userId: 'demo_user_123',
    month: monthStr,
    totalBudget: 60000,
    categoryBudgets: {
      'Food': 12000,
      'Grocery': 8000,
      'Fuel': 5000,
      'Rent': 18000,
      'Bills': 5000,
      'Shopping': 7000,
      'Entertainment': 5000
    }
  });

  const sampleExpenses = [
    { amount: 450, category: 'Food', desc: 'Lunch at Bistro', method: 'UPI', day: 2, time: '13:30' },
    { amount: 2400, category: 'Grocery', desc: 'Weekly supermarket shopping', method: 'Debit Card', day: 3, time: '17:15' },
    { amount: 1200, category: 'Fuel', desc: 'Car fuel refill', method: 'UPI', day: 5, time: '09:10' },
    { amount: 18000, category: 'Rent', desc: 'Monthly apartment rent', method: 'Bank Transfer', day: 1, time: '10:00' },
    { amount: 890, category: 'Food', desc: 'Dinner with team', method: 'Credit Card', day: 7, time: '20:45' },
    { amount: 3200, category: 'Shopping', desc: 'New sports shoes', method: 'Credit Card', day: 10, time: '16:00' },
    { amount: 1500, category: 'Bills', desc: 'High-speed Fiber WiFi bill', method: 'UPI', day: 12, time: '11:00' },
    { amount: 650, category: 'Entertainment', desc: 'Movie tickets', method: 'UPI', day: 14, time: '19:30' },
    { amount: 3500, category: 'Grocery', desc: 'Monthly provisions', method: 'UPI', day: 15, time: '14:20' },
    { amount: 2100, category: 'Medical', desc: 'Health checkup & pharmacy', method: 'Debit Card', day: 18, time: '10:30' },
    { amount: 600, category: 'Food', desc: 'Weekend cafe treats', method: 'Cash', day: 20, time: '15:45' },
    { amount: 2800, category: 'EMI', desc: 'Laptop monthly EMI', method: 'Bank Transfer', day: 22, time: '08:00' },
    { amount: 499, category: 'Subscription', desc: 'Streaming service plan', method: 'Credit Card', day: 24, time: '12:00' },
    { amount: 350, category: 'Fuel', desc: 'Scooter gas refill', method: 'UPI', day: Math.min(25, currentDaysInMonth), time: '18:10' }
  ];

  sampleExpenses.forEach((item, index) => {
    const dayStr = String(Math.min(item.day, currentDaysInMonth)).padStart(2, '0');
    memoryStore.expenses.push({
      id: `exp_${index + 1}`,
      _id: `exp_${index + 1}`,
      userId: 'demo_user_123',
      amount: item.amount,
      category: item.category,
      date: `${year}-${month}-${dayStr}`,
      time: item.time,
      paymentMethod: item.method,
      description: item.desc,
      receiptImage: '',
      isDeleted: false,
      createdAt: new Date().toISOString()
    });
  });

  const sampleIncome = [
    { amount: 85000, category: 'Salary', desc: 'Monthly Salary Credit', day: 1 },
    { amount: 15000, category: 'Freelance', desc: 'Web App Design Project', day: 12 },
    { amount: 3500, category: 'Investment', desc: 'Stock Dividends', day: 20 }
  ];

  sampleIncome.forEach((item, index) => {
    const dayStr = String(Math.min(item.day, currentDaysInMonth)).padStart(2, '0');
    memoryStore.income.push({
      id: `inc_${index + 1}`,
      _id: `inc_${index + 1}`,
      userId: 'demo_user_123',
      amount: item.amount,
      category: item.category,
      date: `${year}-${month}-${dayStr}`,
      time: '10:00',
      description: item.desc,
      isDeleted: false,
      createdAt: new Date().toISOString()
    });
  });
}

// Load or save local store
function loadLocalStore() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf8');
      memoryStore = JSON.parse(content);
      return;
    } catch (e) {
      console.error('Error loading data_store.json:', e);
    }
  }
  seedDemoData();
  saveLocalStore();
}

function saveLocalStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2));
  } catch (e) {
    console.error('Error saving data_store.json:', e);
  }
}

loadLocalStore();

let isMongoConnected = false;

function setMongoConnected(status) {
  isMongoConnected = status;
}

function getMongoStatus() {
  return isMongoConnected;
}

module.exports = {
  memoryStore,
  saveLocalStore,
  setMongoConnected,
  getMongoStatus
};
