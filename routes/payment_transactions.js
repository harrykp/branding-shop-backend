// branding-shop-backend/routes/payment_transactions.js

const router = require('express').Router();
const db     = require('../db');

// GET all transactions
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        pt.id,
        pt.order_id,
        o.total        AS order_total,
        pt.user_id,
        u.name         AS customer_name,
        pt.payment_type_id,
        pt.gateway,
        pt.amount,
        pt.received_at,
        pt.created_at
      FROM payment_transactions pt
      LEFT JOIN orders o           ON o.id = pt.order_id
      LEFT JOIN users u            ON u.id = pt.user_id
      ORDER BY pt.received_at DESC, pt.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/payment-transactions error', err);
    res.status(500).json({ error: 'Failed to fetch payment transactions' });
  }
});

// GET a single transaction
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM payment_transactions WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Transaction not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/payment-transactions/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// POST create a new payment transaction
router.post('/', async (req, res) => {
  const { order_id, user_id, payment_type_id, gateway, amount, received_at } = req.body;
  if (!order_id || !user_id || !payment_type_id || amount == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO payment_transactions
         (order_id, user_id, payment_type_id, gateway, amount, received_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [order_id, user_id, payment_type_id, gateway||null, amount, received_at||'NOW()']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/payment-transactions error', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PATCH update a transaction
router.patch('/:id', async (req, res) => {
  const fields = ['order_id','user_id','payment_type_id','gateway','amount','received_at'];
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
    const { rows } = await db.query(
      `UPDATE payment_transactions
       SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Transaction not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/payment-transactions/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE a transaction
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM payment_transactions WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Transaction not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/payment-transactions/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
