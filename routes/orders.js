// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/orders?page=&limit=&search=
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = `%${req.query.search || ''}%`;

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON o.sales_rep_id = u.id
       WHERE c.name ILIKE $1 OR u.name ILIKE $1`, [search]
    );

    const ordersResult = await db.query(
      `SELECT o.*, c.name AS customer_name, u.name AS sales_rep_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON o.sales_rep_id = u.id
       WHERE c.name ILIKE $1 OR u.name ILIKE $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`, [search, limit, offset]
    );

    res.json({ orders: ordersResult.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  const { customer_id, sales_rep_id, status, total } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO orders (customer_id, sales_rep_id, status, total, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [customer_id, sales_rep_id, status, total]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  const { customer_id, sales_rep_id, status, total } = req.body;
  try {
    const result = await db.query(
      `UPDATE orders SET customer_id=$1, sales_rep_id=$2, status=$3, total=$4
       WHERE id=$5 RETURNING *`,
      [customer_id, sales_rep_id, status, total, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM orders WHERE id=$1`, [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
