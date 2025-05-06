// branding-shop-backend/routes/orders.js

const router = require('express').Router();
const db     = require('../db');

// GET all orders
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        o.id,
        o.user_id,
        u.name    AS customer_name,
        o.quote_id,
        q.total   AS quote_total,
        o.total,
        o.status,
        o.placed_at,
        o.payment_status,
        o.created_at
      FROM orders o
      JOIN users u   ON u.id = o.user_id
      LEFT JOIN quotes q ON q.id = o.quote_id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/orders error', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET single order
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM orders WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/orders/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST create new order from a quote
router.post('/', async (req, res) => {
  const user_id  = req.user.id;
  const { quote_id } = req.body;
  if (!quote_id) {
    return res.status(400).json({ error: 'Missing quote_id' });
  }

  try {
    // grab quote to get the total
    const { rows: qrows } = await db.query(
      `SELECT customer_id, total FROM quotes WHERE id = $1`,
      [quote_id]
    );
    if (!qrows[0]) return res.status(404).json({ error: 'Quote not found' });
    const quote = qrows[0];
    // ensure the authenticated user matches the quote owner
    if (quote.customer_id !== user_id) {
      return res.status(403).json({ error: 'Not allowed to convert this quote' });
    }

    const { rows } = await db.query(
      `INSERT INTO orders
         (user_id, quote_id, total, status, placed_at, payment_status)
       VALUES ($1,$2,$3,'new',NOW(),'pending')
       RETURNING *`,
      [user_id, quote_id, quote.total]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/orders error', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// PATCH update order (status, payment_status)
router.patch('/:id', async (req, res) => {
  const fields = ['status','payment_status'];
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
      `UPDATE orders
       SET ${sets.join(', ')}
       WHERE id=$${vals.length}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/orders/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE order
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM orders WHERE id=$1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Order not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/orders/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
