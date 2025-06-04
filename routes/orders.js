// routes/orders.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/orders with pagination & filtering
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    const ordersQuery = `
      SELECT o.id, o.status, o.total, o.created_at,
             c.name AS customer_name, u.name AS sales_rep_name,
             o.customer_id, o.sales_rep_id
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN users u ON o.sales_rep_id = u.id
      WHERE c.name ILIKE $1 OR u.name ILIKE $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `
      SELECT COUNT(*) FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN users u ON o.sales_rep_id = u.id
      WHERE c.name ILIKE $1 OR u.name ILIKE $1
    `;

    const { rows } = await db.query(ordersQuery, [`%${search}%`, limit, offset]);
    const countResult = await db.query(countQuery, [`%${search}%`]);
    const total = parseInt(countResult.rows[0].count);

    res.json({ data: rows, total });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// GET single order with items
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const orderRes = await db.query(
      `SELECT o.*, c.name AS customer_name, u.name AS sales_rep_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON o.sales_rep_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    const itemsRes = await db.query(
      `SELECT oi.*, p.name AS product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    const order = orderRes.rows[0];
    order.items = itemsRes.rows;
    res.json(order);
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

// POST new order
router.post('/', async (req, res) => {
  const { customer_id, sales_rep_id, status, items } = req.body;
  const created_at = new Date();
  const total = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

  try {
    const result = await db.query(
      `INSERT INTO orders (customer_id, sales_rep_id, status, total, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [customer_id, sales_rep_id, status, total, created_at]
    );
    const orderId = result.rows[0].id;

    for (const item of items) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, qty, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.qty, item.unit_price]
      );
    }

    res.status(201).json({ message: 'Order created' });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// PUT update order
router.put('/:id', async (req, res) => {
  const { customer_id, sales_rep_id, status, items } = req.body;
  const id = req.params.id;
  const total = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

  try {
    await db.query(
      `UPDATE orders SET customer_id = $1, sales_rep_id = $2, status = $3, total = $4 WHERE id = $5`,
      [customer_id, sales_rep_id, status, total, id]
    );

    await db.query(`DELETE FROM order_items WHERE order_id = $1`, [id]);

    for (const item of items) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, qty, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [id, item.product_id, item.qty, item.unit_price]
      );
    }

    res.json({ message: 'Order updated' });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

// DELETE order
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    await db.query('DELETE FROM orders WHERE id = $1', [id]);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ message: 'Failed to delete order' });
  }
});

module.exports = router;
