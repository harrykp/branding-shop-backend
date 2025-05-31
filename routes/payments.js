const express = require('express');
const router = express.Router();
const db = require('../db');
const { filterByOwnership, getOwnershipClause } = require('../middleware/userAccess');

// GET /api/payments - list payments (admin = all, users = their own)
router.get('/', filterByOwnership(), async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM payments';
    const { clause, values } = getOwnershipClause(req);
    const finalQuery = clause ? \`\${baseQuery} \${clause}\` : baseQuery;
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
  const userId = req.user.id;
  try {
    const result = await db.query(
      'INSERT INTO payments (user_id, order_id, amount, method, reference) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, order_id, amount, method, reference]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating payment:", err);
    res.status(500).json({ message: "Error creating payment" });
  }
});

// GET /api/payments/:id
router.get('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { clause, values } = getOwnershipClause(req, 'AND');
  try {
    const result = await db.query(\`SELECT * FROM payments WHERE id = $1 \${clause}\`, [id, ...values]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Payment not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error retrieving payment:", err);
    res.status(500).json({ message: "Error retrieving payment" });
  }
});

module.exports = router;
