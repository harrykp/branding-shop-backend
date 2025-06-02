// routes/quotes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET all quotes with pagination, filtering, and joins
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const filter = `%${search.toLowerCase()}%`;

  try {
    const dataQuery = `
      SELECT q.*, c.name AS customer_name, u.name AS sales_rep_name
      FROM quotes q
      JOIN customers c ON q.customer_id = c.id
      JOIN users u ON q.sales_rep_id = u.id
      WHERE LOWER(c.name) LIKE $1 OR LOWER(u.name) LIKE $1
      ORDER BY q.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*)
      FROM quotes q
      JOIN customers c ON q.customer_id = c.id
      JOIN users u ON q.sales_rep_id = u.id
      WHERE LOWER(c.name) LIKE $1 OR LOWER(u.name) LIKE $1
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [filter, limit, offset]),
      db.query(countQuery, [filter])
    ]);

    res.json({ data: dataResult.rows, total: parseInt(countResult.rows[0].count, 10) });
  } catch (err) {
    console.error('Error loading quotes:', err);
    res.status(500).json({ error: 'Failed to load quotes' });
  }
});

// POST create new quote
router.post('/', authenticate, async (req, res) => {
  const { customer_id, sales_rep_id, status, total } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO quotes (customer_id, sales_rep_id, status, total, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [customer_id, sales_rep_id, status, total]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating quote:', err);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// PUT update quote
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { customer_id, sales_rep_id, status, total } = req.body;
  try {
    const result = await db.query(
      'UPDATE quotes SET customer_id = $1, sales_rep_id = $2, status = $3, total = $4 WHERE id = $5 RETURNING *',
      [customer_id, sales_rep_id, status, total, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating quote:', err);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// DELETE quote
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM quotes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting quote:', err);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

module.exports = router;
