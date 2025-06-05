const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/industries
router.get('/industries', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name FROM industries ORDER BY name');
    res.json({ data: rows });
  } catch (err) {
    console.error('Error fetching industries:', err);
    res.status(500).json({ message: 'Failed to fetch industries' });
  }
});

// GET /api/referral_sources
router.get('/referral_sources', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name FROM referral_sources ORDER BY name');
    res.json({ data: rows });
  } catch (err) {
    console.error('Error fetching referral sources:', err);
    res.status(500).json({ message: 'Failed to fetch referral sources' });
  }
});

module.exports = router;
