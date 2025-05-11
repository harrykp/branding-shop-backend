// branding-shop-backend/routes/payments.js

const router = require('express').Router();
const db = require('../db');
const { Pool } = require('pg');

// Create a dedicated pool so we can get a client for transactions
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

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
        j.id          AS job_id,
        j.status      AS job_status
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

// POST capture a payment and auto-create a production job
router.post('/', async (req, res) => {
  const { order_id, amount, gateway } = req.body;
  if (!order_id || !amount || !gateway) {
    return res.status(400).json({ error: 'Missing required fields: order_id, amount, gateway' });
  }

  const client = await pool.connect();
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

    // 2) Fetch associated quote_id from orders
    const orderRes = await client.query(
      `SELECT quote_id FROM orders WHERE id = $1`,
      [order_id]
    );
    if (!orderRes.rows[0]) throw new Error(`Order ${order_id} not found`);
    const quoteId = orderRes.rows[0].quote_id;

    // 3) Fetch quantity from quotes
    const quoteRes = await client.query(
      `SELECT quantity FROM quotes WHERE id = $1`,
      [quoteId]
    );
    const qty = quoteRes.rows[0]?.quantity || 0;

    // 4) Fetch deal info for this quote (if any)
    const dealRes = await client.query(
      `SELECT id AS deal_id, assigned_to FROM deals WHERE quote_id = $1`,
      [quoteId]
    );
    const deal = dealRes.rows[0] || {};
    const dealId = deal.deal_id || null;
    const assignedTo = deal.assigned_to || null;

    // 5) Insert a production job
    const jobRes = await client.query(
      `INSERT INTO jobs
         (order_id, deal_id, type, qty, assigned_to, status, start_date, due_date)
       VALUES ($1, $2, 'production', $3, $4, 'queued', now(), now() + INTERVAL '1 day')
       RETURNING *`,
      [order_id, dealId, qty, assignedTo]
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
