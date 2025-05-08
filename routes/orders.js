// branding-shop-backend/routes/orders.js

const router = require('express').Router();
const db     = require('../db');

// GET all orders
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        o.id,
        o.quote_id,
        o.user_id            AS customer_id,
        u.name               AS customer_name,
        o.total,
        o.status,
        o.placed_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.placed_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/orders error', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST create new order (from quote)
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { quote_id } = req.body;

  if (!quote_id) {
    return res.status(400).json({ error: 'Missing quote_id' });
  }

  try {
    // 1) fetch and lock the quote row
    const { rows: qrows } = await db.query(
      `SELECT * FROM quotes WHERE id = $1 FOR UPDATE`,
      [quote_id]
    );
    const quote = qrows[0];
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    if (quote.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending quotes can be converted' });
    }

    // 2) insert into orders
    const { rows: orows } = await db.query(
      `INSERT INTO orders
         (quote_id, user_id, total, status)
       VALUES ($1, $2, $3, 'new')
       RETURNING id, quote_id, user_id AS customer_id, total, status, placed_at`,
      [quote_id, quote.customer_id, quote.total]
    );
    const order = orows[0];

    // 3) mark quote as converted
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
