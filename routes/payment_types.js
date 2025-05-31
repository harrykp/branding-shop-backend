const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/payment_types
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access only" });
  }

  try {
    const result = await db.query('SELECT * FROM payment_types ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error("Payment types error:", err);
    res.status(500).json({ message: "Error fetching payment types" });
  }
});

module.exports = router;
