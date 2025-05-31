const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/daily-transactions
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('accountant')) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM daily_transactions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ message: "Error fetching transactions" });
  }
});

// POST /api/daily-transactions
router.post('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('accountant')) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { date, start_cash, end_cash, payments, expenses, deposits, updated_by } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO daily_transactions (date, start_cash, end_cash, payments, expenses, deposits, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [date, start_cash, end_cash, payments, expenses, deposits, updated_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error saving transaction:", err);
    res.status(500).json({ message: "Error saving transaction" });
  }
});

module.exports = router;
