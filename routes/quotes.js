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
// 1) lookup base product price + category
const prodRes = await db.query(
  `SELECT price, category_id
     FROM products
    WHERE id = $1`,
  [product_id]
);
if (!prodRes.rows[0]) {
  return res.status(400).json({ error: `Invalid product_id=${product_id}` });
}
let unitPrice = parseFloat(prodRes.rows[0].price);
const categoryId = prodRes.rows[0].category_id;

// 2) fetch any matching pricing rules (category‐specific OR global)
const rulesRes = await db.query(
  `SELECT rule_type, unit_price AS rule_val
     FROM pricing_rules
    WHERE (product_category_id IS NULL OR product_category_id = $1)
      AND $2 >= min_qty
      AND ( $2 <= max_qty OR max_qty IS NULL )`,
  [categoryId, quantity]
);

// 3) apply each matching rule in turn
for (const { rule_type, rule_val } of rulesRes.rows) {
  const pct = parseFloat(rule_val);
  if (rule_type === 'surcharge_pct') {
    // e.g. pct = 1.0 means +100% → double price
    unitPrice = unitPrice * (1 + pct);
  } else if (rule_type === 'discount_pct') {
    // e.g. pct = 0.02 means 2% off
    unitPrice = unitPrice * (1 - pct);
  }
}

// 4) compute total
const total = unitPrice * parseInt(quantity, 10);

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
