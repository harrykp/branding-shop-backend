// routes/quotes.js (Frozen Working Version)

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all quotes with pagination
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    const quotesQuery = `
      SELECT q.id, q.status, q.total, q.created_at,
             c.name AS customer_name,
             u.name AS sales_rep_name,
             q.customer_id, q.sales_rep_id
      FROM quotes q
      JOIN customers c ON q.customer_id = c.id
      JOIN users u ON q.sales_rep_id = u.id
      WHERE c.name ILIKE $1 OR u.name ILIKE $1
      ORDER BY q.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `
      SELECT COUNT(*) FROM quotes q
      JOIN customers c ON q.customer_id = c.id
      JOIN users u ON q.sales_rep_id = u.id
      WHERE c.name ILIKE $1 OR u.name ILIKE $1
    `;

    const { rows } = await db.query(quotesQuery, [`%${search}%`, limit, offset]);
    const countResult = await db.query(countQuery, [`%${search}%`]);
    const total = parseInt(countResult.rows[0].count);

    res.json({ data: rows, total });
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ message: 'Failed to fetch quotes' });
  }
});

// GET single quote with items
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const quoteRes = await db.query(`
      SELECT q.*, c.name AS customer_name, u.name AS sales_rep_name
      FROM quotes q
      JOIN customers c ON q.customer_id = c.id
      JOIN users u ON q.sales_rep_id = u.id
      WHERE q.id = $1
    `, [id]);

    const itemsRes = await db.query(`
      SELECT qi.*, p.name AS product_name
      FROM quote_items qi
      JOIN products p ON qi.product_id = p.id
      WHERE qi.quote_id = $1
    `, [id]);

    const quote = quoteRes.rows[0];
    quote.items = itemsRes.rows;
    res.json(quote);
  } catch (err) {
    console.error('Error fetching quote:', err);
    res.status(500).json({ message: 'Failed to fetch quote' });
  }
});

// POST new quote
router.post('/', async (req, res) => {
  const { customer_id, sales_rep_id, status, items } = req.body;
  const created_at = new Date();
  const total = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

  try {
    const result = await db.query(`
      INSERT INTO quotes (customer_id, sales_rep_id, status, total, created_at)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [customer_id, sales_rep_id, status, total, created_at]);
    const quoteId = result.rows[0].id;

    for (const item of items) {
      await db.query(`
        INSERT INTO quote_items (quote_id, product_id, qty, unit_price)
        VALUES ($1, $2, $3, $4)
      `, [quoteId, item.product_id, item.qty, item.unit_price]);
    }

    res.status(201).json({ message: 'Quote created' });
  } catch (err) {
    console.error('Error creating quote:', err);
    res.status(500).json({ message: 'Failed to create quote' });
  }
});

// PUT update quote
router.put('/:id', async (req, res) => {
  const { customer_id, sales_rep_id, status, items } = req.body;
  const id = req.params.id;
  const total = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

  try {
    await db.query(`
      UPDATE quotes SET customer_id=$1, sales_rep_id=$2, status=$3, total=$4 WHERE id=$5
    `, [customer_id, sales_rep_id, status, total, id]);

    await db.query(`DELETE FROM quote_items WHERE quote_id = $1`, [id]);

    for (const item of items) {
      await db.query(`
        INSERT INTO quote_items (quote_id, product_id, qty, unit_price)
        VALUES ($1, $2, $3, $4)
      `, [id, item.product_id, item.qty, item.unit_price]);
    }

    res.json({ message: 'Quote updated' });
  } catch (err) {
    console.error('Error updating quote:', err);
    res.status(500).json({ message: 'Failed to update quote' });
  }
});

// DELETE quote
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);
    await db.query('DELETE FROM quotes WHERE id = $1', [id]);
    res.json({ message: 'Quote deleted' });
  } catch (err) {
    console.error('Error deleting quote:', err);
    res.status(500).json({ message: 'Failed to delete quote' });
  }
});

module.exports = router;
