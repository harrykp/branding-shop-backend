const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/reports/leave
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.roles.includes('admin') || req.user.roles.includes('hr')) {
      const result = await db.query('SELECT * FROM reports_leave ORDER BY employee_id');
      return res.json(result.rows);
    } else {
      const result = await db.query('SELECT * FROM reports_leave WHERE employee_id = $1', [req.user.id]);
      return res.json(result.rows);
    }
  } catch (err) {
    console.error("Leave report error:", err);
    res.status(500).json({ message: "Error fetching leave report" });
  }
});

module.exports = router;
