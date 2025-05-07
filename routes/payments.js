// branding-shop-backend/routes/payments.js
const router = require('express').Router();
const db = require('../db');

// GET all payments
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, order_id, gateway, transaction_id, amount, status, paid_at, created_at
      FROM payments
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/payments error', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET single payment
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, order_id, gateway, transaction_id, amount, status, paid_at, created_at
      FROM payments
      WHERE id=$1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/payments/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// POST new payment
router.post('/', async (req, res) => {
  const { order_id, gateway, transaction_id, amount, status, paid_at } = req.body;
  if (!order_id || !gateway || amount == null) {
    return res.status(400).json({ error: 'order_id, gateway and amount are required' });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO payments
        (order_id, gateway, transaction_id, amount, status, paid_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, order_id, gateway, transaction_id, amount, status, paid_at, created_at
    `, [order_id, gateway, transaction_id||null, amount, status||'pending', paid_at||null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/payments error', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// PATCH update payment
router.patch('/:id', async (req, res) => {
  const fields = ['gateway','transaction_id','amount','status','paid_at'];
  const sets = [], vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f}=$${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'No updatable fields' });
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(`
      UPDATE payments
      SET ${sets.join(', ')}
      WHERE id=$${vals.length}
      RETURNING id, order_id, gateway, transaction_id, amount, status, paid_at, created_at
    `, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Payment not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/payments/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE payment
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM payments WHERE id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Payment not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/payments/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
