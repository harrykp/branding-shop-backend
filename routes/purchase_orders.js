// branding-shop-backend/routes/purchase_orders.js

const router = require('express').Router();
const db = require('../db');

// GET all purchase orders
// GET /api/purchase-orders
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        supplier_id,
        created_at,
        status
      FROM purchase_orders
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/purchase-orders error', err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// GET single purchase order
// GET /api/purchase-orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        supplier_id,
        created_at,
        status
      FROM purchase_orders
      WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/purchase-orders/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// POST create new purchase order
// POST /api/purchase-orders
router.post('/', async (req, res) => {
  const { supplier_id, status } = req.body;
  if (!supplier_id) {
    return res.status(400).json({ error: 'supplier_id is required' });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO purchase_orders
        (supplier_id, status)
      VALUES ($1, $2)
      RETURNING id, supplier_id, created_at, status
    `, [supplier_id, status || 'pending']);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/purchase-orders error', err);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

// PATCH update purchase order
// PATCH /api/purchase-orders/:id
router.patch('/:id', async (req, res) => {
  const fields = ['supplier_id','status'];
  const sets = [], vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields' });
  }
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(`
      UPDATE purchase_orders
      SET ${sets.join(', ')}
      WHERE id = $${vals.length}
      RETURNING id, supplier_id, created_at, status
    `, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/purchase-orders/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// DELETE a purchase order
// DELETE /api/purchase-orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`
      DELETE FROM purchase_orders WHERE id = $1
    `, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Purchase order not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/purchase-orders/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});

module.exports = router;
