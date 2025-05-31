const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/approvals
router.get('/', authenticate, async (req, res) => {
  const allowedRoles = ['manager', 'executive', 'admin'];
  if (!req.user.roles.some(r => allowedRoles.includes(r))) {
    return res.status(403).json({ message: "Approval access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM approvals ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error loading approvals:", err);
    res.status(500).json({ message: "Failed to fetch approvals" });
  }
});

module.exports = router;
