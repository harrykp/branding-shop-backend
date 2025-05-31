const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/targets
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.roles.includes('admin')) {
      const result = await db.query('SELECT * FROM sales_targets ORDER BY month DESC');
      return res.json(result.rows);
    } else if (req.user.roles.includes('sales')) {
      const result = await db.query(
        'SELECT * FROM sales_targets WHERE user_id = $1 ORDER BY month DESC',
        [req.user.id]
      );
      return res.json(result.rows);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }
  } catch (err) {
    console.error("Error fetching targets:", err);
    res.status(500).json({ message: "Error loading targets" });
  }
});

module.exports = router;
