const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { filterByOwnership, getOwnershipClause } = require('../middleware/userAccess');

// GET /api/orders - list orders (admins see all, users see their own)
router.get('/', filterByOwnership(), async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM orders';
    const { clause, values } = getOwnershipClause(req);
    const finalQuery = clause ? `${baseQuery} ${clause}` : baseQuery;
    const result = await db.query(finalQuery, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/orders - create new order
router.post('/', async (req, res) => {
  const { quote_id, total_amount, status } = req.body;
  const userId = req.user.id;
  try {
    const result = await db.query(
      'INSERT INTO orders (user_id, quote_id, total_amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, quote_id, total_amount, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
});

// GET /api/orders/:id
router.get('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { clause, values } = getOwnershipClause(req, 'AND');
  try {
    const result = await db.query(`SELECT * FROM orders WHERE id = $1 ${clause}`, [id, ...values]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Order not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error retrieving order:", err);
    res.status(500).json({ message: "Error retrieving order" });
  }
});

// PUT /api/orders/:id
router.put('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { clause, values } = getOwnershipClause(req, 'AND');

  try {
    const result = await db.query(
      `UPDATE orders SET status = $1 WHERE id = $2 ${clause} RETURNING *`,
      [status, id, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Order not found or unauthorized" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ message: "Error updating order" });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { clause, values } = getOwnershipClause(req, 'AND');
  try {
    const result = await db.query(`DELETE FROM orders WHERE id = $1 ${clause}`, [id, ...values]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Order not found or unauthorized" });
    res.json({ message: "Order deleted" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ message: "Error deleting order" });
  }
});

// GET /api/orders/count
router.get('/count', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM orders');
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error("Order count error:", err);
    res.status(500).json({ message: "Error fetching order count" });
  }
});


module.exports = router;
