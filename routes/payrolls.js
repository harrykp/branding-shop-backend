const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/payrolls
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.roles.includes('admin') || req.user.roles.includes('finance')) {
      const result = await db.query('SELECT * FROM payrolls ORDER BY period DESC');
      return res.json(result.rows);
    } else {
      const result = await db.query('SELECT * FROM payrolls WHERE employee_id = $1 ORDER BY period DESC', [req.user.id]);
      return res.json(result.rows);
    }
  } catch (err) {
    console.error("Payrolls error:", err);
    res.status(500).json({ message: "Error fetching payrolls" });
  }
});

module.exports = router;
