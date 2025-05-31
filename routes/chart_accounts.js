const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/chart_accounts
router.get('/', authenticate, async (req, res) => {
  const allowedRoles = ['admin', 'finance'];
  if (!req.user.roles.some(r => allowedRoles.includes(r))) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM chart_accounts ORDER BY code');
    res.json(result.rows);
  } catch (err) {
    console.error("Chart accounts error:", err);
    res.status(500).json({ message: "Error fetching chart of accounts" });
  }
});

module.exports = router;
