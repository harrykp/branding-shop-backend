// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Get a single order with items
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const orderResult = await db.query(
      `SELECT o.*, c.name AS customer_name, u.name AS sales_rep_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u ON o.sales_rep_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    const itemsResult = await db.query(
      `SELECT oi.*, p.name AS product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    order.items = itemsResult.rows;
    res.json(order);
  } catch (err) {
    console.error("Error fetching order with items:", err);
    res.status(500).json({ message: 'Failed to retrieve order' });
  }
});

module.exports = router;
