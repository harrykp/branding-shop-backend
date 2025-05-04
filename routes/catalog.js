// branding-shop-backend/routes/catalog.js
const router = require('express').Router();
const db = require('../db');

// GET /api/catalog
// Returns all catalog items along with supplier name
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        ci.id,
        ci.sku,
        ci.name,
        ci.cost,
        ci.currency,
        s.name AS supplier_name
      FROM catalog_items ci
      JOIN suppliers s
        ON ci.supplier_id = s.id
      ORDER BY s.name, ci.sku
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/catalog error:', err);
    res.status(500).json({ error: 'Failed to fetch catalog items' });
  }
});

module.exports = router;
