// branding-shop-backend/routes/quotes.js

const router = require('express').Router();
const db = require('../db');

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
    if (!rows[0]) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/quotes/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// POST create new quote (calculates pricing server-side)
router.post('/', async (req, res) => {
  const customer_id = req.user.id;
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'Missing product_id or quantity' });
  }

  try {
    // 1) Lookup product base price and category
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

    // 2) Fetch matching pricing rules
    const rulesRes = await db.query(
      `SELECT rule_type, unit_price AS rule_val
         FROM pricing_rules
        WHERE (product_category_id IS NULL OR product_category_id = $1)
          AND $2 >= min_qty
          AND ( $2 <= max_qty OR max_qty IS NULL )`,
      [categoryId, quantity]
    );

    // 3) Apply each pricing rule
    for (const { rule_type, rule_val } of rulesRes.rows) {
      const val = parseFloat(rule_val);
      if (rule_type === 'surcharge_pct') {
        unitPrice *= (1 + val);
      } else if (rule_type === 'discount_pct') {
        unitPrice *= (1 - val);
      } else if (rule_type === 'fixed') {
        unitPrice = val;
      } else if (rule_type === 'markup_fixed') {
        unitPrice += val;
      }
    }

    // 4) Compute total
    const total = unitPrice * parseInt(quantity, 10);

    // 5) Insert quote
    const insertRes = await db.query(
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

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('POST /api/quotes error', err);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// PATCH update quote status
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Missing status field' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE quotes
         SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, status`,
      [status, req.params.id]
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
