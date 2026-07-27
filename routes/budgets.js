const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { memoryStore, saveLocalStore, getMongoStatus } = require('../store');
const { Budget, Expense } = require('../models/models');

// Get monthly budget & current progress calculation
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

    let budgetData = null;

    if (getMongoStatus()) {
      budgetData = await Budget.findOne({ userId, month });
      const expenses = await Expense.find({
        userId,
        isDeleted: false,
        date: { $regex: `^${month}` }
      });

      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

      const categorySpent = {};
      expenses.forEach(e => {
        categorySpent[e.category] = (categorySpent[e.category] || 0) + e.amount;
      });

      const totalBudget = budgetData ? budgetData.totalBudget : 0;
      const categoryBudgets = budgetData && budgetData.categoryBudgets ? Object.fromEntries(budgetData.categoryBudgets) : {};

      return res.json({
        month,
        totalBudget,
        totalSpent,
        percentageUsed: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        categoryBudgets,
        categorySpent
      });
    } else {
      budgetData = memoryStore.budgets.find(b => b.userId === userId && b.month === month);
      const userExpenses = memoryStore.expenses.filter(e => e.userId === userId && !e.isDeleted && e.date.startsWith(month));

      const totalSpent = userExpenses.reduce((sum, e) => sum + e.amount, 0);
      const categorySpent = {};
      userExpenses.forEach(e => {
        categorySpent[e.category] = (categorySpent[e.category] || 0) + e.amount;
      });

      const totalBudget = budgetData ? budgetData.totalBudget : 0;
      const categoryBudgets = budgetData && budgetData.categoryBudgets ? budgetData.categoryBudgets : {};

      return res.json({
        month,
        totalBudget,
        totalSpent,
        percentageUsed: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        categoryBudgets,
        categorySpent
      });
    }
  } catch (err) {
    console.error('Fetch budget error:', err);
    res.status(500).json({ message: 'Error retrieving budget data.' });
  }
});

// Set or Update monthly budget & category budgets
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, totalBudget, categoryBudgets } = req.body;

    const monthStr = month || new Date().toISOString().slice(0, 7);
    const numTotal = parseFloat(totalBudget || 0);

    if (getMongoStatus()) {
      let budget = await Budget.findOne({ userId, month: monthStr });
      if (!budget) {
        budget = new Budget({ userId, month: monthStr, totalBudget: numTotal, categoryBudgets: categoryBudgets || {} });
      } else {
        budget.totalBudget = numTotal;
        if (categoryBudgets) budget.categoryBudgets = categoryBudgets;
      }
      await budget.save();
      return res.json(budget);
    } else {
      let index = memoryStore.budgets.findIndex(b => b.userId === userId && b.month === monthStr);
      if (index === -1) {
        const newB = {
          id: `b_${Date.now()}`,
          _id: `b_${Date.now()}`,
          userId,
          month: monthStr,
          totalBudget: numTotal,
          categoryBudgets: categoryBudgets || {}
        };
        memoryStore.budgets.push(newB);
        saveLocalStore();
        return res.json(newB);
      } else {
        memoryStore.budgets[index].totalBudget = numTotal;
        if (categoryBudgets) memoryStore.budgets[index].categoryBudgets = categoryBudgets;
        saveLocalStore();
        return res.json(memoryStore.budgets[index]);
      }
    }
  } catch (err) {
    console.error('Set budget error:', err);
    res.status(500).json({ message: 'Failed to update budget.' });
  }
});

module.exports = router;
