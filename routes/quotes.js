// branding-shop-backend/routes/quotes.js

const router = require('express').Router();
const db     = require('../db');

// GET all quotes
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        q.id,
        q.customer_id,
        u.name               AS customer_name,
        u.phone_number       AS customer_phone,
        q.product_id,
        p.name               AS product_name,
        p.sku                AS product_code,
        q.quantity,
        q.unit_price,
        q.total,
        q.status,
        q.created_at
      FROM quotes q
      JOIN users    u ON u.id = q.customer_id
      JOIN products p ON p.id = q.product_id
      ORDER BY q.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/quotes error', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// GET single quote
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         q.id,
         q.customer_id,
         u.name               AS customer_name,
         u.phone_number       AS customer_phone,
         q.product_id,
         p.name               AS product_name,
         p.sku                AS product_code,
         q.quantity,
         q.unit_price,
         q.total,
         q.status,
         q.created_at
       FROM quotes q
       JOIN users    u ON u.id = q.customer_id
       JOIN products p ON p.id = q.product_id
       WHERE q.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Quote not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/quotes/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// POST create new quote (by product)
router.post('/', async (req, res) => {
  const customer_id = req.user.id;
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'Missing product_id or quantity' });
  }

  try {
    // lookup product price
    const prodQ = await db.query(
      `SELECT price FROM products WHERE id = $1`,
      [product_id]
    );
    if (!prodQ.rows[0]) {
      return res.status(400).json({ error: `Invalid product_id=${product_id}` });
    }
    const unitPrice = parseFloat(prodQ.rows[0].price);
    const total     = unitPrice * parseInt(quantity, 10);

    // insert the quote
    const { rows } = await db.query(
      `INSERT INTO quotes
         (customer_id, product_id, quantity, unit_price, total, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING
         id,
         customer_id,
         product_id,
         quantity,
         unit_price,
         total,
         status,
         created_at`,
      [customer_id, product_id, quantity, unitPrice, total]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/quotes error', err);
    res.status(500).json({ error: err.message || 'Failed to create quote' });
  }
});

// PATCH update quote (status only)
router.patch('/:id', async (req, res) => {
  const fields = ['status'];
  const sets   = [];
  const vals   = [];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = $${sets.length + 1}`);
      vals.push(req.body[field]);
    }
  });

  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields' });
  }

  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE quotes
       SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING id, status`,
      vals
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/quotes/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// DELETE quote
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM quotes WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/quotes/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

module.exports = router;
