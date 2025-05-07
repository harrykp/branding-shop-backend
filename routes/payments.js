// branding-shop-backend/routes/payments.js

const router = require('express').Router();
const db     = require('../db');

// GET all payments (customers see only their own; admins see all)
router.get('/', async (req, res) => {
  try {
    let result;
    if (req.user.role_names.includes('customer')) {
      result = await db.query(
        `SELECT id, order_id, amount, gateway, status, paid_at, created_at
         FROM payments
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [req.user.id]
      );
    } else {
      result = await db.query(
        `SELECT id, order_id, user_id, amount, gateway, status, paid_at, created_at
         FROM payments
         ORDER BY created_at DESC`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/payments error', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST create a new payment
router.post('/', async (req, res) => {
  const { order_id, amount, gateway, transaction_id } = req.body;
  const user_id = req.user.id;
  if (!order_id || !amount || !gateway) {
    return res.status(400).json({ error: 'Missing order_id, amount or gateway' });
  }

  try {
    // verify order exists
    const { rows: orders } = await db.query(
      `SELECT id, total FROM orders WHERE id = $1`, [order_id]
    );
    if (!orders[0]) return res.status(404).json({ error: 'Order not found' });

    // insert payment
    const now = new Date();
    const { rows } = await db.query(
      `INSERT INTO payments
         (order_id, user_id, gateway, transaction_id, amount, status, paid_at, created_at)
       VALUES ($1,$2,$3,$4,$5,'completed',$6,$6)
       RETURNING id, order_id, amount, gateway, status, paid_at, created_at`,
      [order_id, user_id, gateway, transaction_id || null, amount, now]
    );

    // mark order paid
    await db.query(
      `UPDATE orders SET payment_status = 'paid' WHERE id = $1`,
      [order_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/payments error', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

module.exports = router;
