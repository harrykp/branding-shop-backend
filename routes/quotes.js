// routes/quotes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all quotes with customer and sales rep info
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = `%${req.query.search || ''}%`;

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM quotes q
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.sales_rep_id = u.id
       WHERE c.name ILIKE $1 OR u.name ILIKE $1`, [search]
    );

    const quotesResult = await db.query(
      `SELECT q.*, c.name AS customer_name, u.name AS sales_rep_name
       FROM quotes q
       JOIN customers c ON q.customer_id = c.id
       JOIN users u ON q.sales_rep_id = u.id
       WHERE c.name ILIKE $1 OR u.name ILIKE $1
       ORDER BY q.created_at DESC
       LIMIT $2 OFFSET $3`, [search, limit, offset]
    );

    const quotes = quotesResult.rows;

    // Attach quote items
    for (const quote of quotes) {
      const itemsRes = await db.query(
        `SELECT qi.*, p.name AS product_name FROM quote_items qi
         JOIN products p ON qi.product_id = p.id
         WHERE qi.quote_id = $1`, [quote.id]
      );
      quote.items = itemsRes.rows;
    }

    res.json({ data: quotes, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// POST create quote with items
router.post('/', async (req, res) => {
  const { customer_id, sales_rep_id, status, total, items } = req.body;
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const quoteRes = await client.query(
      `INSERT INTO quotes (customer_id, sales_rep_id, status, total, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [customer_id, sales_rep_id, status, total]
    );
    const quoteId = quoteRes.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $3 * $4)`,
        [quoteId, item.product_id, item.quantity, item.unit_price]
      );
    }

    await client.query('COMMIT');
    res.json(quoteRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating quote:', err);
    res.status(500).json({ error: 'Failed to create quote' });
  } finally {
    client.release();
  }
});

// PUT update quote and items
router.put('/:id', async (req, res) => {
  const quoteId = req.params.id;
  const { customer_id, sales_rep_id, status, total, items } = req.body;
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE quotes SET customer_id=$1, sales_rep_id=$2, status=$3, total=$4 WHERE id=$5`,
      [customer_id, sales_rep_id, status, total, quoteId]
    );

    await client.query(`DELETE FROM quote_items WHERE quote_id=$1`, [quoteId]);

    for (const item of items) {
      await client.query(
        `INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $3 * $4)`,
        [quoteId, item.product_id, item.quantity, item.unit_price]
      );
    }

    await client.query('COMMIT');
    res.sendStatus(200);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating quote:', err);
    res.status(500).json({ error: 'Failed to update quote' });
  } finally {
    client.release();
  }
});

// DELETE quote
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM quotes WHERE id=$1`, [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting quote:', err);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

module.exports = router;
