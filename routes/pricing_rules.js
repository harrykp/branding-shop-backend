// branding-shop-backend/routes/pricing_rules.js

const router = require('express').Router();
const db = require('../db');

// GET all pricing rules
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT pr.id,
             pr.name,
             pr.product_category_id,
             pc.name AS category_name,
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
      SELECT pr.id,
             pr.name,
             pr.product_category_id,
             pc.name AS category_name,
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
      RETURNING id, name, product_category_id, rule_type,
                min_qty, max_qty, unit_price, created_at, updated_at
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
  const sets = [], vals = [];
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = $${sets.length + 1}`);
      vals.push(req.body[field]);
    }
  });
  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields' });
  }
  // always update the timestamp
  sets.push(`updated_at = now()`);
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(`
      UPDATE pricing_rules
      SET ${sets.join(', ')}
      WHERE id = $${vals.length}
      RETURNING id, name, product_category_id, rule_type,
                min_qty, max_qty, unit_price, created_at, updated_at
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
    const { rowCount } = await db.query(`
      DELETE FROM pricing_rules WHERE id = $1
    `, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Pricing rule not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/pricing-rules/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete pricing rule' });
  }
});



// ─── NEW: Real-Time Pricing Calculator ─────────────────────────────────────────

/**
 * POST /api/pricing-rules/calc
 * Body: { product_id, quantity,
 *         material_cost, labor_cost, shipping_cost }
 * Returns: { unitPrice, baseTotal, materialCost,
 *            laborCost, shippingCost, total }
 */
router.post('/calc', async (req, res) => {
  const {
    product_id,
    quantity,
    material_cost = 0,
    labor_cost = 0,
    shipping_cost = 0
  } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'Missing product_id or quantity' });
  }

  try {
    // 1) Get base price & category
    const prod = await db.query(
      `SELECT price, category_id FROM products WHERE id = $1`,
      [product_id]
    );
    if (!prod.rows[0]) {
      return res.status(400).json({ error: `Invalid product_id=${product_id}` });
    }
    let unitPrice = parseFloat(prod.rows[0].price);
    const categoryId = prod.rows[0].category_id;

    // 2) Fetch any matching pricing rules
    const rules = await db.query(
      `SELECT rule_type, unit_price AS rule_val
         FROM pricing_rules
        WHERE (product_category_id IS NULL OR product_category_id = $1)
          AND $2 >= min_qty
          AND ( $2 <= max_qty OR max_qty IS NULL )`,
      [categoryId, quantity]
    );

    // 3) Apply each rule
    for (const { rule_type, rule_val } of rules.rows) {
      const val = parseFloat(rule_val);
      if (rule_type === 'surcharge_pct') {
        unitPrice *= (1 + val);
      } else if (rule_type === 'discount_pct') {
        unitPrice *= (1 - val);
      } else if (rule_type === 'fixed') {
        unitPrice = val;           // override
      } else if (rule_type === 'markup_fixed') {
        unitPrice += val;
      }
      // add more rule_types here if needed
    }

    // 4) Compute totals
    const baseTotal     = unitPrice * quantity;
    const materialCost  = parseFloat(material_cost) || 0;
    const laborCost     = parseFloat(labor_cost)    || 0;
    const shippingCost  = parseFloat(shipping_cost) || 0;
    const total         = baseTotal + materialCost + laborCost + shippingCost;

    res.json({ unitPrice, baseTotal, materialCost, laborCost, shippingCost, total });
  } catch (err) {
    console.error('POST /api/pricing-rules/calc error', err);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
});


module.exports = router;
