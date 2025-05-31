const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/insurances
router.get('/', authenticate, async (req, res) => {
  const allowedRoles = ['admin', 'hr'];
  if (!req.user.roles.some(r => allowedRoles.includes(r))) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM insurances ORDER BY employee_id');
    res.json(result.rows);
  } catch (err) {
    console.error("Insurances error:", err);
    res.status(500).json({ message: "Error fetching insurance records" });
  }
});

module.exports = router;
