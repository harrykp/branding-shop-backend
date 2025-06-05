// routes/industries.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/industries
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM industries ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching industries:', err);
    res.status(500).json({ error: 'Failed to load industries' });
  }
});

module.exports = router;
