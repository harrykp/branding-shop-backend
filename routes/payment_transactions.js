const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/payment_transactions
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('finance')) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM payment_transactions ORDER BY payment_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Payment transactions error:", err);
    res.status(500).json({ message: "Error fetching transactions" });
  }
});

module.exports = router;
