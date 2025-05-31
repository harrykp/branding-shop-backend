const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/payment_arrears
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.roles.includes('admin') || req.user.roles.includes('finance')) {
      const result = await db.query('SELECT * FROM payment_arrears ORDER BY due_date DESC');
      return res.json(result.rows);
    } else if (req.user.roles.includes('sales')) {
      const result = await db.query(
        'SELECT * FROM payment_arrears WHERE sales_rep_id = $1 ORDER BY due_date DESC',
        [req.user.id]
      );
      return res.json(result.rows);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }
  } catch (err) {
    console.error("Payment arrears error:", err);
    res.status(500).json({ message: "Error fetching payment arrears" });
  }
});

module.exports = router;
