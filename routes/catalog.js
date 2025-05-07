// branding-shop-backend/routes/catalog.js

const router = require('express').Router();
const db = require('../db');

// GET all catalog items
// GET /api/catalog
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        supplier_id,
        sku,
        name,
        cost,
        currency
      FROM catalog_items
      ORDER BY id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/catalog error', err);
    res.status(500).json({ error: 'Failed to fetch catalog items' });
  }
});

// GET single catalog item
// GET /api/catalog/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        supplier_id,
        sku,
        name,
        cost,
        currency
      FROM catalog_items
      WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Catalog item not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/catalog/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch catalog item' });
  }
});

// POST create new catalog item
// POST /api/catalog
router.post('/', async (req, res) => {
  const { supplier_id, sku, name, cost, currency } = req.body;
  if (!supplier_id || !sku || !name) {
    return res.status(400).json({ error: 'supplier_id, sku, and name are required' });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO catalog_items
        (supplier_id, sku, name, cost, currency)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, supplier_id, sku, name, cost, currency
    `, [supplier_id, sku, name, cost||0, currency||'USD']);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/catalog error', err);
    res.status(500).json({ error: 'Failed to create catalog item' });
  }
});

// PATCH update catalog item
// PATCH /api/catalog/:id
router.patch('/:id', async (req, res) => {
  const fields = ['supplier_id','sku','name','cost','currency'];
  const sets = [], vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields' });
  }
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(`
      UPDATE catalog_items
      SET ${sets.join(', ')}
      WHERE id = $${vals.length}
      RETURNING id, supplier_id, sku, name, cost, currency
    `, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Catalog item not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/catalog/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update catalog item' });
  }
});

// DELETE a catalog item
// DELETE /api/catalog/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`
      DELETE FROM catalog_items WHERE id = $1
    `, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Catalog item not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/catalog/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete catalog item' });
  }
});

module.exports = router;
