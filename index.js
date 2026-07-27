const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const { setMongoConnected } = require('./store');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection attempt
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('⚡ Connected to MongoDB Atlas successfully.');
      setMongoConnected(true);
    })
    .catch(err => {
      console.warn('⚠️ MongoDB Connection Failed. Operating in Local Data Store mode:', err.message);
      setMongoConnected(false);
    });
} else {
  console.log('ℹ️ No MONGODB_URI provided. Running smoothly with Local Data Store (data_store.json).');
  setMongoConnected(false);
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/income', require('./routes/income'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/reports', require('./routes/reports'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Mobile Personal Expense Tracker API is running smoothly',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Expense Tracker Server listening on http://0.0.0.0:${PORT}`);
});
