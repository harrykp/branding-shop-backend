// branding-shop-backend/routes/suppliers.js

const router = require('express').Router();
const db = require('../db');

// GET all suppliers
// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, website
      FROM suppliers
      ORDER BY id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/suppliers error', err);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET a single supplier
// GET /api/suppliers/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, website
      FROM suppliers
      WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Supplier not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/suppliers/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// POST create a new supplier
// POST /api/suppliers
router.post('/', async (req, res) => {
  const { name, website } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO suppliers (name, website)
      VALUES ($1, $2)
      RETURNING id, name, website
    `, [name, website || null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/suppliers error', err);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PATCH update a supplier
// PATCH /api/suppliers/:id
router.patch('/:id', async (req, res) => {
  const fields = ['name','website'];
  const sets = [];
  const vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length + 1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields' });
  }
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(`
      UPDATE suppliers
      SET ${sets.join(', ')}
      WHERE id = $${vals.length}
      RETURNING id, name, website
    `, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Supplier not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/suppliers/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE a supplier
// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`
      DELETE FROM suppliers
      WHERE id = $1
    `, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Supplier not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/suppliers/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

module.exports = router;
