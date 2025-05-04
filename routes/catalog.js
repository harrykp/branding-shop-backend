// branding-shop-backend/routes/catalog.js
const router = require('express').Router();
const db = require('../db');

// GET all catalog items
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT ci.id,ci.sku,ci.name,ci.cost,ci.currency,
           s.name AS supplier_name
    FROM catalog_items ci
    JOIN suppliers s ON ci.supplier_id=s.id
    ORDER BY s.name,ci.sku
  `);
  res.json(rows);
});

// (Add POST/PATCH/DELETE if desired)

module.exports = router;
