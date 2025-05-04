// branding-shop-backend/routes/purchase_orders.js
const router = require('express').Router();
const db = require('../db');

// GET /api/purchase-orders
// Returns all purchase orders with supplier name
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        po.id,
        s.name AS supplier_name,
        po.status,
        po.created_at
      FROM purchase_orders po
      JOIN suppliers s
        ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/purchase-orders error:', err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

module.exports = router;
