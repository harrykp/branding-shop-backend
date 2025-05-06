// branding-shop-backend/routes/product_categories.js

const router = require('express').Router();
const db = require('../db');

// GET all product categories
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name
      FROM product_categories
      ORDER BY name;
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/product-categories error', err);
    res.status(500).json({ error: 'Failed to fetch product categories' });
  }
});

module.exports = router;
