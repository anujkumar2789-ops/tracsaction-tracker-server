const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { memoryStore, getMongoStatus } = require('../store');
const { Expense, Income } = require('../models/models');

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const currentMonth = today.slice(0, 7); // YYYY-MM
    const currentYear = today.slice(0, 4); // YYYY

    let userExpenses = [];
    let userIncome = [];

    if (getMongoStatus()) {
      userExpenses = await Expense.find({ userId, isDeleted: false });
      userIncome = await Income.find({ userId, isDeleted: false });
    } else {
      userExpenses = memoryStore.expenses.filter(e => e.userId === userId && !e.isDeleted);
      userIncome = memoryStore.income.filter(i => i.userId === userId && !i.isDeleted);
    }

    // Totals
    const totalIncome = userIncome.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = userExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBalance = totalIncome - totalExpenses;
    const savings = totalBalance > 0 ? totalBalance : 0;

    // Spending by period
    const todaySpending = userExpenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
    
    // Weekly spending (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
    const weeklySpending = userExpenses.filter(e => e.date >= sevenDaysAgoStr).reduce((sum, e) => sum + e.amount, 0);

    const monthlySpending = userExpenses.filter(e => e.date.startsWith(currentMonth)).reduce((sum, e) => sum + e.amount, 0);
    const monthlyIncome = userIncome.filter(i => i.date.startsWith(currentMonth)).reduce((sum, i) => sum + i.amount, 0);
    const yearlySpending = userExpenses.filter(e => e.date.startsWith(currentYear)).reduce((sum, e) => sum + e.amount, 0);

    // Spending by Category (for Pie Chart)
    const categoryTotals = {};
    userExpenses.filter(e => e.date.startsWith(currentMonth)).forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const categoryPieData = Object.keys(categoryTotals).map(cat => ({
      name: cat,
      value: categoryTotals[cat]
    }));

    // Monthly spending trend (Last 6 months)
    const monthTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStr = d.toISOString().slice(0, 7);
      const mLabel = d.toLocaleString('default', { month: 'short' });

      const mExp = userExpenses.filter(e => e.date.startsWith(mStr)).reduce((sum, e) => sum + e.amount, 0);
      const mInc = userIncome.filter(inc => inc.date.startsWith(mStr)).reduce((sum, inc) => sum + inc.amount, 0);

      monthTrend.push({
        month: mLabel,
        yearMonth: mStr,
        expense: mExp,
        income: mInc
      });
    }

    res.json({
      totalBalance,
      totalIncome,
      totalExpenses,
      savings,
      todaySpending,
      weeklySpending,
      monthlySpending,
      monthlyIncome,
      yearlySpending,
      categoryPieData,
      monthTrend
    });
  } catch (err) {
    console.error('Report summary error:', err);
    res.status(500).json({ message: 'Error generating report summary.' });
  }
});

module.exports = router;
