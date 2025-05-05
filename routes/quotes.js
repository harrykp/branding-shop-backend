// branding-shop-backend/routes/quotes.js

const router = require('express').Router();
const db = require('../db');

// Helper: fetch unit price via pricing_rules
async function getUnitPrice(categoryId, qty) {
  const { rows } = await db.query(
    `SELECT unit_price
     FROM pricing_rules
     WHERE product_category_id = $1
       AND min_qty <= $2
       AND (max_qty IS NULL OR max_qty >= $2)
     ORDER BY min_qty DESC
     LIMIT 1`,
    [categoryId, qty]
  );
  if (!rows[0]) throw new Error('No pricing rule matches this category & quantity');
  return rows[0].unit_price;
}

// GET all quotes
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT q.id, q.customer_id, u.name AS customer_name,
             q.product_category_id, c.name AS category_name,
             q.quantity, q.unit_price, q.total, q.status, q.created_at
      FROM quotes q
      JOIN users u               ON u.id = q.customer_id
      JOIN product_categories c  ON c.id = q.product_category_id
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
      `SELECT id, customer_id, product_category_id, quantity, unit_price, total, status
       FROM quotes WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Quote not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/quotes/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// POST create new quote (applies pricing rules)
router.post('/', async (req, res) => {
  const { customer_id, product_category_id, quantity } = req.body;
  if (!customer_id || !product_category_id || !quantity) {
    return res.status(400).json({ error: 'Missing customer_id, product_category_id, or quantity' });
  }

  try {
    // lookup unit price based on rules
    const unitPrice = await getUnitPrice(product_category_id, quantity);
    const total     = parseFloat(unitPrice) * parseInt(quantity, 10);

    const { rows } = await db.query(
      `INSERT INTO quotes
         (customer_id, product_category_id, quantity, unit_price, total, status)
       VALUES ($1,$2,$3,$4,$5,'pending')
       RETURNING id, customer_id, product_category_id, quantity, unit_price, total, status`,
      [customer_id, product_category_id, quantity, unitPrice, total]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/quotes error', err);
    res.status(500).json({ error: err.message || 'Failed to create quote' });
  }
});

// PATCH update quote (allows status change)
router.patch('/:id', async (req, res) => {
  const fields = ['status'];
  const sets = [], vals = [];
  fields.forEach((f, i) => {
    if (req.body[f] !== undefined) {
      sets.push(`${f}=$${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'No updatable fields' });
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE quotes
       SET ${sets.join(', ')}
       WHERE id=$${vals.length}
       RETURNING id, status`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Quote not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/quotes/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// DELETE quote
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM quotes WHERE id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Quote not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/quotes/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

module.exports = router;
