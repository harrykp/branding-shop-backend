const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/expenses - Admins and accountants only
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user.roles.includes('admin') && !req.user.roles.includes('accountant')) {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await db.query('SELECT * FROM expenses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/expenses
router.post('/', authenticate, async (req, res) => {
  const { description, amount, category, expense_date } = req.body;

  if (!req.user.roles.includes('admin') && !req.user.roles.includes('accountant')) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query(
      'INSERT INTO expenses (description, amount, category, expense_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, amount, category, expense_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating expense:", err);
    res.status(500).json({ message: "Error saving expense" });
  }
});

module.exports = router;
