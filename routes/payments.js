// branding-shop-backend/routes/payments.js

const router = require('express').Router();
const db = require('../db');

// GET all payments/receipts
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        order_id,
        gateway,
        transaction_id,
        amount,
        status,
        paid_at,
        created_at
      FROM payments
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/payments error', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST record a new payment
router.post('/', async (req, res) => {
  const { order_id, amount, gateway } = req.body;
  if (!order_id || !amount || !gateway) {
    return res
      .status(400)
      .json({ error: 'Missing order_id, amount, or gateway' });
  }

  try {
    // insert into payments
    const { rows } = await db.query(
      `INSERT INTO payments
         (order_id, gateway, amount, status, paid_at)
       VALUES ($1, $2, $3, 'paid', now())
       RETURNING
         id,
         order_id,
         gateway,
         transaction_id,
         amount,
         status,
         paid_at,
         created_at`,
      [order_id, gateway, amount]
    );

    // mark the order as paid
    await db.query(
      `UPDATE orders
         SET payment_status = 'paid', updated_at = now()
       WHERE id = $1`,
      [order_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/payments error', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

module.exports = router;
