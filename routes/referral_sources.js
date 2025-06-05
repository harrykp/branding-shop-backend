// routes/referral_sources.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/referral-sources
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM referral_sources ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching referral sources:', err);
    res.status(500).json({ error: 'Failed to load referral sources' });
  }
});

module.exports = router;
