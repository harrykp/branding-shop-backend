const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/reports/cashflow
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('finance')) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM reports_cashflow ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Cashflow report error:", err);
    res.status(500).json({ message: "Error fetching cashflow report" });
  }
});

module.exports = router;
