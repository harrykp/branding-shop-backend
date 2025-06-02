// routes/quotes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/quotes - paginated + filtered
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    const countQuery = `
      SELECT COUNT(*) FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN users u ON q.sales_rep_id = u.id
      WHERE c.name ILIKE $1 OR u.name ILIKE $1
    `;
    const countResult = await db.query(countQuery, [`%${search}%`]);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT q.*, c.name AS customer_name, u.name AS sales_rep_name
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN users u ON q.sales_rep_id = u.id
      WHERE c.name ILIKE $1 OR u.name ILIKE $1
      ORDER BY q.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(dataQuery, [`%${search}%`, limit, offset]);

    res.json({ data: result.rows, total });
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// POST /api/quotes - create
router.post('/', authenticate, async (req, res) => {
  const { customer_id, sales_rep_id, status, total } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO quotes (customer_id, sales_rep_id, status, total, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [customer_id, sales_rep_id, status, total]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating quote:', err);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// PUT /api/quotes/:id - update
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { customer_id, sales_rep_id, status, total } = req.body;
  try {
    const result = await db.query(
      `UPDATE quotes
       SET customer_id = $1, sales_rep_id = $2, status = $3, total = $4
       WHERE id = $5 RETURNING *`,
      [customer_id, sales_rep_id, status, total, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating quote:', err);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// DELETE /api/quotes/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM quotes WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting quote:', err);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

module.exports = router;
