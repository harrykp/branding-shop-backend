// branding-shop-backend/routes/orders.js

const router = require('express').Router();
const db     = require('../db');

// GET all orders (for admin or per-user)
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.roles && req.user.roles.includes('super_admin');
    const userId  = req.user.id;
    let query, params;

    if (isAdmin) {
      query = `
        SELECT
          o.id,
          o.user_id          AS customer_id,
          u.name             AS customer_name,
          o.quote_id,
          o.total,
          o.status,
          o.payment_status,
          o.placed_at
        FROM orders o
        JOIN users u ON u.id = o.user_id
        ORDER BY o.placed_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT
          o.id,
          o.user_id          AS customer_id,
          o.quote_id,
          o.total,
          o.status,
          o.payment_status,
          o.placed_at
        FROM orders o
        WHERE o.user_id = $1
        ORDER BY o.placed_at DESC
      `;
      params = [userId];
    }

    const { rows } = await db.query(query, params);
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
      `
      SELECT
        id,
        quote_id,
        user_id          AS customer_id,
        total,
        status,
        placed_at,
        payment_status
      FROM orders
      WHERE id = $1
      `,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/orders/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST convert a quote into a new order
router.post('/', async (req, res) => {
  const customer_id = req.user.id;
  const { quote_id } = req.body;
  if (!quote_id) {
    return res.status(400).json({ error: 'Missing quote_id' });
  }

  try {
    // lock & fetch the quote
    const quoteRes = await db.query(
      `SELECT * FROM quotes WHERE id = $1 FOR UPDATE`,
      [quote_id]
    );
    const quote = quoteRes.rows[0];
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    if (quote.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending quotes can be converted' });
    }

    // insert order
    const insertRes = await db.query(
      `
      INSERT INTO orders
        (quote_id, user_id, total, status, payment_status, placed_at)
      VALUES ($1, $2, $3, 'new', 'pending', NOW())
      RETURNING id, quote_id, user_id AS customer_id, total, status, placed_at, payment_status
      `,
      [quote_id, customer_id, quote.total]
    );
    const order = insertRes.rows[0];

    // mark quote as converted
    await db.query(
      `UPDATE quotes SET status = 'converted' WHERE id = $1`,
      [quote_id]
    );

    res.status(201).json(order);
  } catch (err) {
    console.error('POST /api/orders error', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PATCH update order (any updatable field)
router.patch('/:id', async (req, res) => {
  const allowed = ['quote_id','user_id','total','status','payment_status'];
  const sets = [];
  const values = [];

  allowed.forEach(field => {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = $${sets.length + 1}`);
      values.push(req.body[field]);
    }
  });

  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields' });
  }

  values.push(req.params.id);

  try {
    const { rows } = await db.query(
      `
      UPDATE orders
      SET ${sets.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, quote_id, user_id AS customer_id, total, status, placed_at, payment_status
      `,
      values
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }
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
      `DELETE FROM orders WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/orders/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
