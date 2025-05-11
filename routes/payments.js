// branding-shop-backend/routes/payments.js

const router = require('express').Router();
const db     = require('../db');

// GET all payments (for admin)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        p.id,
        p.order_id,
        p.amount,
        p.gateway,
        p.status,
        p.paid_at,
        p.created_at,
        j.id   AS job_id,
        j.status AS job_status
      FROM payments p
      LEFT JOIN jobs j ON j.order_id = p.order_id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/payments error', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST capture a payment and auto‐create a production job
router.post('/', async (req, res) => {
  const { order_id, amount, gateway } = req.body;
  if (!order_id || !amount || !gateway) {
    return res
      .status(400)
      .json({ error: 'Missing required fields: order_id, amount, gateway' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1) Insert the payment record
    const payRes = await client.query(
      `INSERT INTO payments
         (order_id, amount, gateway, status, paid_at)
       VALUES ($1, $2, $3, 'completed', now())
       RETURNING id, order_id, amount, gateway, status, paid_at, created_at`,
      [order_id, amount, gateway]
    );
    const payment = payRes.rows[0];

    // 2) Fetch associated quote quantity (via orders → quotes)
    const orderRes = await client.query(
      `SELECT quote_id
         FROM orders
        WHERE id = $1`,
      [order_id]
    );
    if (!orderRes.rows[0]) {
      throw new Error(`Order ${order_id} not found`);
    }
    const quoteId = orderRes.rows[0].quote_id;

    const quoteRes = await client.query(
      `SELECT quantity
         FROM quotes
        WHERE id = $1`,
      [quoteId]
    );
    const qty = quoteRes.rows[0]?.quantity || 0;

    // 3) Create a production job for that order
    const jobRes = await client.query(
      `INSERT INTO jobs
         (order_id, type, qty, status, start_date, due_date)
       VALUES ($1, 'production', $2, 'queued', now(), now() + INTERVAL '1 day')
       RETURNING id, order_id, type, qty, status, start_date, due_date`,
      [order_id, qty]
    );
    const job = jobRes.rows[0];

    await client.query('COMMIT');

    res.status(201).json({ payment, job });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/payments error', err);
    res.status(500).json({ error: err.message || 'Failed to record payment' });
  } finally {
    client.release();
  }
});

module.exports = router;
