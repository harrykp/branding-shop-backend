// branding-shop-backend/routes/pricing_rules.js

const router = require('express').Router();
const db     = require('../db');

// GET all pricing rules
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, product_category_id, rule_type, min_qty, max_qty, unit_price, created_at, updated_at
      FROM pricing_rules
      ORDER BY id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/pricing-rules error', err);
    res.status(500).json({ error: 'Failed to fetch pricing rules' });
  }
});

// GET one
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, product_category_id, rule_type, min_qty, max_qty, unit_price
       FROM pricing_rules WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/pricing-rules/${req.params.id}`, err);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST create
router.post('/', async (req, res) => {
  const { name, product_category_id, rule_type, min_qty, max_qty, unit_price } = req.body;
  if (!name || !product_category_id || !rule_type || min_qty == null || unit_price == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO pricing_rules
        (name, product_category_id, rule_type, min_qty, max_qty, unit_price)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, name, product_category_id, rule_type, min_qty, max_qty, unit_price, created_at, updated_at
    `, [name, product_category_id, rule_type, min_qty, max_qty, unit_price]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/pricing-rules error', err);
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PATCH update
router.patch('/:id', async (req, res) => {
  const fields = ['name','product_category_id','rule_type','min_qty','max_qty','unit_price'];
  const sets   = [];
  const vals   = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(`
      UPDATE pricing_rules SET ${sets.join(', ')}
      WHERE id = $${vals.length}
      RETURNING id, name, product_category_id, rule_type, min_qty, max_qty, unit_price, updated_at
    `, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/pricing-rules/${req.params.id}`, err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM pricing_rules WHERE id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/pricing-rules/${req.params.id}`, err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
