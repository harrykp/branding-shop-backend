// branding-shop-backend/routes/purchase_orders.js
const router = require('express').Router();
const db = require('../db');

// GET all POs
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT po.id, s.name AS supplier_name, po.status, po.created_at
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id=s.id
    ORDER BY po.created_at DESC
  `);
  res.json(rows);
});

// (Add POST/PATCH/DELETE if desired)

module.exports = router;
