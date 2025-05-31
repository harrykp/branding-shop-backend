const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/mockups
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM mockups ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Mockups error:", err);
    res.status(500).json({ message: "Error fetching mockups" });
  }
});

module.exports = router;
