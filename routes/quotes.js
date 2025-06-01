const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { filterByOwnership, getOwnershipClause } = require('../middleware/userAccess');

// GET /api/quotes/count - Admins only
router.get('/count', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM quotes');
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error("Quote count error:", err);
    res.status(500).json({ message: "Error fetching quote count" });
  }
});

// GET /api/quotes - list quotes (admins see all, users see their own)
router.get('/', authenticate, filterByOwnership(), async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM quotes';
    const { clause, values } = getOwnershipClause(req);
    const finalQuery = clause ? `${baseQuery} ${clause}` : baseQuery;
    const result = await db.query(finalQuery, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching quotes:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/quotes - create new quote
router.post('/', authenticate, async (req, res) => {
  const { product_id, quantity, print_type } = req.body;
  const userId = req.user.id;
  try {
    const result = await db.query(
      'INSERT INTO quotes (user_id, product_id, quantity, print_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, product_id, quantity, print_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating quote:", err);
    res.status(500).json({ message: "Failed to create quote" });
  }
});

// GET /api/quotes/:id - fetch single quote
router.get('/:id', authenticate, filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { clause, values } = getOwnershipClause(req, 'AND');
  try {
    const result = await db.query(
      `SELECT * FROM quotes WHERE id = $1 ${clause}`,
      [id, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Quote not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error retrieving quote:", err);
    res.status(500).json({ message: "Error retrieving quote" });
  }
});

// PUT /api/quotes/:id - update quote
router.put('/:id', authenticate, filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { product_id, quantity, print_type } = req.body;
  const { clause, values } = getOwnershipClause(req, 'AND');
  try {
    const result = await db.query(
      `UPDATE quotes SET product_id = $1, quantity = $2, print_type = $3 WHERE id = $4 ${clause} RETURNING *`,
      [product_id, quantity, print_type, id, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Quote not found or unauthorized" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating quote:", err);
    res.status(500).json({ message: "Error updating quote" });
  }
});

// DELETE /api/quotes/:id - delete quote
router.delete('/:id', authenticate, filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { clause, values } = getOwnershipClause(req, 'AND');
  try {
    const result = await db.query(
      `DELETE FROM quotes WHERE id = $1 ${clause}`,
      [id, ...values]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Quote not found or unauthorized" });
    res.json({ message: "Quote deleted" });
  } catch (err) {
    console.error("Error deleting quote:", err);
    res.status(500).json({ message: "Error deleting quote" });
  }
});

module.exports = router;
