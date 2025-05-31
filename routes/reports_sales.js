const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/reports/sales
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const result = await db.query('SELECT * FROM reports_sales ORDER BY order_id');
      return res.json(result.rows);
    } else if (req.user.roles.includes('sales')) {
      const result = await db.query('SELECT * FROM reports_sales WHERE sales_rep_id = $1 ORDER BY order_id', [req.user.id]);
      return res.json(result.rows);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }
  } catch (err) {
    console.error("Sales report error:", err);
    res.status(500).json({ message: "Error fetching sales report" });
  }
});

module.exports = router;
