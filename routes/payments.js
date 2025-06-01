const express = require('express');
const router = express.Router();
const db = require('../db');
const { filterByOwnership, getOwnershipClause } = require('../middleware/userAccess');

// GET /api/payments - list payments (admin = all, users = only their own via orders)
router.get('/', filterByOwnership(), async (req, res) => {
  try {
    const baseQuery = `
      SELECT p.*
      FROM payments p
      JOIN orders o ON p.order_id = o.id
    `;
    const { clause, values } = getOwnershipClause(req, 'WHERE', 'o.user_id');
    const finalQuery = clause ? `${baseQuery} ${clause}` : baseQuery;

    const result = await db.query(finalQuery, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/payments - create a payment
router.post('/', async (req, res) => {
  const { order_id, amount, method, reference } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO payments (order_id, amount, method, reference) VALUES ($1, $2, $3, $4) RETURNING *',
      [order_id, amount, method, reference]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating payment:", err);
    res.status(500).json({ message: "Error creating payment" });
  }
});

// GET /api/payments/:id - fetch specific payment if user owns the order
router.get('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { clause, values } = getOwnershipClause(req, 'AND', 'o.user_id');
  try {
    const query = `
      SELECT p.*
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.id = $1 ${clause}
    `;
    const result = await db.query(query, [id, ...values]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Payment not found or unauthorized" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error retrieving payment:", err);
    res.status(500).json({ message: "Error retrieving payment" });
  }
});

module.exports = router;
