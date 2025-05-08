// branding-shopend-backend/routes/pricing_rules.js

const router = require('express').Router();
const db     = require('../db');

// GET all pricing rules
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        pr.id,
        pr.name,
        pr.product_category_id,
        pc.name       AS category_name,
        pr.rule_type,
        pr.min_qty,
        pr.max_qty,
        pr.unit_price,
        pr.created_at,
        pr.updated_at
      FROM pricing_rules pr
      LEFT JOIN product_categories pc
        ON pc.id = pr.product_category_id
      ORDER BY pr.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/pricing-rules error', err);
    res.status(500).json({ error: 'Failed to fetch pricing rules' });
  }
});

// GET single pricing rule
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        pr.id,
        pr.name,
        pr.product_category_id,
        pc.name       AS category_name,
        pr.rule_type,
        pr.min_qty,
        pr.max_qty,
        pr.unit_price,
        pr.created_at,
        pr.updated_at
      FROM pricing_rules pr
      LEFT JOIN product_categories pc
        ON pc.id = pr.product_category_id
      WHERE pr.id = $1
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
  const { name, product_category_id, rule_type, min_qty, max_qty, unit_price } = req.body;

  if (!name || !rule_type || min_qty == null || unit_price == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { rows } = await db.query(`
      INSERT INTO pricing_rules
        (name, product_category_id, rule_type, min_qty, max_qty, unit_price)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        name,
        product_category_id,
        rule_type,
        min_qty,
        max_qty,
        unit_price,
        created_at,
        updated_at
    `, [name, product_category_id, rule_type, min_qty, max_qty, unit_price]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/pricing-rules error', err);
    res.status(500).json({ error: 'Failed to create pricing rule' });
  }
});

// PATCH update pricing rule
router.patch('/:id', async (req, res) => {
  const fields = ['name','product_category_id','rule_type','min_qty','max_qty','unit_price'];
  const sets = [];
  const vals = [];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = $${sets.length+1}`);
      vals.push(req.body[field]);
    }
  });

  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields' });
  }

  // add updated_at and id    
  sets.push(`updated_at = now()`);
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(`
      UPDATE pricing_rules
      SET ${sets.join(', ')}
      WHERE id = $${vals.length}
      RETURNING
        id,
        name,
        product_category_id,
        rule_type,
        min_qty,
        max_qty,
        unit_price,
        created_at,
        updated_at
    `, vals);

    if (!rows[0]) return res.status(404).json({ error: 'Pricing rule not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/pricing-rules/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update pricing rule' });
  }
});

// DELETE pricing rule
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
