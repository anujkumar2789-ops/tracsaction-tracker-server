const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { memoryStore, saveLocalStore, getMongoStatus } = require('../store');
const { Expense } = require('../models/models');

// Get expenses with filtering
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, paymentMethod, startDate, endDate, search, includeDeleted } = req.query;

    if (getMongoStatus()) {
      const query = { userId };
      if (includeDeleted !== 'true') query.isDeleted = false;
      if (category) query.category = category;
      if (paymentMethod) query.paymentMethod = paymentMethod;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }
      if (search) {
        query.$or = [
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { paymentMethod: { $regex: search, $options: 'i' } }
        ];
      }

      const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });
      return res.json(expenses);
    } else {
      let list = memoryStore.expenses.filter(e => e.userId === userId);
      if (includeDeleted !== 'true') {
        list = list.filter(e => !e.isDeleted);
      }
      if (category) {
        list = list.filter(e => e.category === category);
      }
      if (paymentMethod) {
        list = list.filter(e => e.paymentMethod === paymentMethod);
      }
      if (startDate) {
        list = list.filter(e => e.date >= startDate);
      }
      if (endDate) {
        list = list.filter(e => e.date <= endDate);
      }
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(e => 
          (e.description && e.description.toLowerCase().includes(s)) ||
          (e.category && e.category.toLowerCase().includes(s)) ||
          (e.paymentMethod && e.paymentMethod.toLowerCase().includes(s)) ||
          (e.amount && String(e.amount).includes(s))
        );
      }

      list.sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00')));
      return res.json(list);
    }
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ message: 'Error retrieving expenses.' });
  }
});

// Add new expense
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, category, date, time, paymentMethod, description, receiptImage } = req.body;

    if (!amount || !category || !date) {
      return res.status(400).json({ message: 'Amount, category, and date are required.' });
    }

    const numAmount = parseFloat(amount);

    if (getMongoStatus()) {
      const newExp = new Expense({
        userId,
        amount: numAmount,
        category,
        date,
        time: time || '12:00',
        paymentMethod: paymentMethod || 'UPI',
        description: description || '',
        receiptImage: receiptImage || ''
      });
      await newExp.save();
      return res.status(201).json(newExp);
    } else {
      const newExp = {
        id: `exp_${Date.now()}`,
        _id: `exp_${Date.now()}`,
        userId,
        amount: numAmount,
        category,
        date,
        time: time || '12:00',
        paymentMethod: paymentMethod || 'UPI',
        description: description || '',
        receiptImage: receiptImage || '',
        isDeleted: false,
        createdAt: new Date().toISOString()
      };
      memoryStore.expenses.push(newExp);
      saveLocalStore();
      return res.status(201).json(newExp);
    }
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ message: 'Failed to create expense.' });
  }
});

// Update expense
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const expId = req.params.id;
    const { amount, category, date, time, paymentMethod, description, receiptImage } = req.body;

    if (getMongoStatus()) {
      const exp = await Expense.findOne({ _id: expId, userId });
      if (!exp) return res.status(404).json({ message: 'Expense not found.' });

      if (amount !== undefined) exp.amount = parseFloat(amount);
      if (category !== undefined) exp.category = category;
      if (date !== undefined) exp.date = date;
      if (time !== undefined) exp.time = time;
      if (paymentMethod !== undefined) exp.paymentMethod = paymentMethod;
      if (description !== undefined) exp.description = description;
      if (receiptImage !== undefined) exp.receiptImage = receiptImage;

      await exp.save();
      return res.json(exp);
    } else {
      const index = memoryStore.expenses.findIndex(e => (e.id === expId || e._id === expId) && e.userId === userId);
      if (index === -1) return res.status(404).json({ message: 'Expense not found.' });

      const item = memoryStore.expenses[index];
      if (amount !== undefined) item.amount = parseFloat(amount);
      if (category !== undefined) item.category = category;
      if (date !== undefined) item.date = date;
      if (time !== undefined) item.time = time;
      if (paymentMethod !== undefined) item.paymentMethod = paymentMethod;
      if (description !== undefined) item.description = description;
      if (receiptImage !== undefined) item.receiptImage = receiptImage;

      memoryStore.expenses[index] = item;
      saveLocalStore();
      return res.json(item);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating expense.' });
  }
});

// Soft Delete expense
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const expId = req.params.id;

    if (getMongoStatus()) {
      const exp = await Expense.findOne({ _id: expId, userId });
      if (!exp) return res.status(404).json({ message: 'Expense not found.' });
      exp.isDeleted = true;
      await exp.save();
      return res.json({ message: 'Expense moved to trash.', id: expId });
    } else {
      const index = memoryStore.expenses.findIndex(e => (e.id === expId || e._id === expId) && e.userId === userId);
      if (index === -1) return res.status(404).json({ message: 'Expense not found.' });

      memoryStore.expenses[index].isDeleted = true;
      saveLocalStore();
      return res.json({ message: 'Expense moved to trash.', id: expId });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error deleting expense.' });
  }
});

// Restore expense from trash
router.post('/:id/restore', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const expId = req.params.id;

    if (getMongoStatus()) {
      const exp = await Expense.findOne({ _id: expId, userId });
      if (!exp) return res.status(404).json({ message: 'Expense not found.' });
      exp.isDeleted = false;
      await exp.save();
      return res.json({ message: 'Expense restored successfully.', exp });
    } else {
      const index = memoryStore.expenses.findIndex(e => (e.id === expId || e._id === expId) && e.userId === userId);
      if (index === -1) return res.status(404).json({ message: 'Expense not found.' });

      memoryStore.expenses[index].isDeleted = false;
      saveLocalStore();
      return res.json({ message: 'Expense restored successfully.', exp: memoryStore.expenses[index] });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error restoring expense.' });
  }
});

// Permanent Delete
router.delete('/:id/permanent', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const expId = req.params.id;

    if (getMongoStatus()) {
      await Expense.deleteOne({ _id: expId, userId });
      return res.json({ message: 'Expense permanently deleted.' });
    } else {
      memoryStore.expenses = memoryStore.expenses.filter(e => !((e.id === expId || e._id === expId) && e.userId === userId));
      saveLocalStore();
      return res.json({ message: 'Expense permanently deleted.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error permanently deleting expense.' });
  }
});

module.exports = router;
