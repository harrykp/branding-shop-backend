// branding-shop-backend/routes/suppliers.js
const router = require('express').Router();
const db = require('../db');

// GET /api/suppliers
// Returns all suppliers
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        id,
        name,
        website
      FROM suppliers
      ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/suppliers error:', err);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

module.exports = router;
