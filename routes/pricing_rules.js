// branding-shop-backend/routes/pricing_rules.js

const router = require('express').Router();
const db = require('../db');

// GET all pricing rules
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.id, r.name, r.product_category_id, c.name AS category_name,
             r.rule_type, r.min_qty, r.max_qty, r.unit_price,
             r.created_at, r.updated_at
      FROM pricing_rules r
      JOIN product_categories c ON c.id = r.product_category_id
      ORDER BY r.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/pricing-rules error', err);
    res.status(500).json({ error: 'Failed to fetch pricing rules' });
  }
});

// GET one pricing rule by id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, product_category_id, rule_type, min_qty, max_qty, unit_price
      FROM pricing_rules
      WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Pricing rule not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/pricing-rules/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch pricing rule' });
  }
});

// POST create new pricing rule
router.post('/', async (req, res) => {
  const { name, product_category_id, rule_type, min_qty = 0, max_qty = null, unit_price } = req.body;
  if (!name || !product_category_id || !rule_type || unit_price == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO pricing_rules
        (name, product_category_id, rule_type, min_qty, max_qty, unit_price)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, name, product_category_id, rule_type, min_qty, max_qty, unit_price
    `, [name, product_category_id, rule_type, min_qty, max_qty, unit_price]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/pricing-rules error', err);
    res.status(500).json({ error: 'Failed to create pricing rule' });
  }
});

// PATCH update an existing pricing rule
router.patch('/:id', async (req, res) => {
  const fields = ['name','product_category_id','rule_type','min_qty','max_qty','unit_price'];
  const sets = [], vals = [];
  fields.forEach((f, i) => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(`
      UPDATE pricing_rules
      SET ${sets.join(', ')}
      WHERE id = $${vals.length}
      RETURNING id, name, product_category_id, rule_type, min_qty, max_qty, unit_price
    `, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Pricing rule not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/pricing-rules/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update pricing rule' });
  }
});

// DELETE a pricing rule
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM pricing_rules WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Pricing rule not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/pricing-rules/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete pricing rule' });
  }
});

module.exports = router;
