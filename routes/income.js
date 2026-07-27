const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { memoryStore, saveLocalStore, getMongoStatus } = require('../store');
const { Income } = require('../models/models');

// Get income records
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, startDate, endDate } = req.query;

    if (getMongoStatus()) {
      const query = { userId, isDeleted: false };
      if (category) query.category = category;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }
      const list = await Income.find(query).sort({ date: -1 });
      return res.json(list);
    } else {
      let list = memoryStore.income.filter(i => i.userId === userId && !i.isDeleted);
      if (category) list = list.filter(i => i.category === category);
      if (startDate) list = list.filter(i => i.date >= startDate);
      if (endDate) list = list.filter(i => i.date <= endDate);
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      return res.json(list);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error fetching income records.' });
  }
});

// Add new income
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, category, date, time, description } = req.body;

    if (!amount || !category || !date) {
      return res.status(400).json({ message: 'Amount, category, and date are required.' });
    }

    const numAmount = parseFloat(amount);

    if (getMongoStatus()) {
      const newInc = new Income({
        userId,
        amount: numAmount,
        category,
        date,
        time: time || '10:00',
        description: description || ''
      });
      await newInc.save();
      return res.status(201).json(newInc);
    } else {
      const newInc = {
        id: `inc_${Date.now()}`,
        _id: `inc_${Date.now()}`,
        userId,
        amount: numAmount,
        category,
        date,
        time: time || '10:00',
        description: description || '',
        isDeleted: false,
        createdAt: new Date().toISOString()
      };
      memoryStore.income.push(newInc);
      saveLocalStore();
      return res.status(201).json(newInc);
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to add income.' });
  }
});

// Update income
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const incId = req.params.id;
    const { amount, category, date, time, description } = req.body;

    if (getMongoStatus()) {
      const inc = await Income.findOne({ _id: incId, userId });
      if (!inc) return res.status(404).json({ message: 'Income entry not found.' });

      if (amount !== undefined) inc.amount = parseFloat(amount);
      if (category !== undefined) inc.category = category;
      if (date !== undefined) inc.date = date;
      if (time !== undefined) inc.time = time;
      if (description !== undefined) inc.description = description;

      await inc.save();
      return res.json(inc);
    } else {
      const index = memoryStore.income.findIndex(i => (i.id === incId || i._id === incId) && i.userId === userId);
      if (index === -1) return res.status(404).json({ message: 'Income entry not found.' });

      const item = memoryStore.income[index];
      if (amount !== undefined) item.amount = parseFloat(amount);
      if (category !== undefined) item.category = category;
      if (date !== undefined) item.date = date;
      if (time !== undefined) item.time = time;
      if (description !== undefined) item.description = description;

      memoryStore.income[index] = item;
      saveLocalStore();
      return res.json(item);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating income entry.' });
  }
});

// Delete income
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const incId = req.params.id;

    if (getMongoStatus()) {
      await Income.deleteOne({ _id: incId, userId });
      return res.json({ message: 'Income entry deleted.', id: incId });
    } else {
      memoryStore.income = memoryStore.income.filter(i => !((i.id === incId || i._id === incId) && i.userId === userId));
      saveLocalStore();
      return res.json({ message: 'Income entry deleted.', id: incId });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error deleting income entry.' });
  }
});

module.exports = router;
