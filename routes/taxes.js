const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/taxes
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('accountant')) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM taxes ORDER BY tax_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching taxes:", err);
    res.status(500).json({ message: "Error fetching taxes" });
  }
});

// POST /api/taxes
router.post('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('accountant')) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { tax_type, amount, tax_date } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO taxes (tax_type, amount, tax_date) VALUES ($1, $2, $3) RETURNING *',
      [tax_type, amount, tax_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error saving tax record:", err);
    res.status(500).json({ message: "Error saving tax record" });
  }
});

module.exports = router;
