// branding-shop-backend/routes/leads.js

const router = require('express').Router();
const db = require('../db');

// GET all leads
// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        name,
        email,
        phone,
        status,
        created_by,
        created_at
      FROM leads
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/leads error', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET single lead
// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        name,
        email,
        phone,
        status,
        created_by,
        created_at
      FROM leads
      WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/leads/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST create new lead
// POST /api/leads
router.post('/', async (req, res) => {
  const { name, email, phone, status } = req.body;
  const created_by = req.user.id; // whoever is logged in
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO leads
        (name, email, phone, status, created_by)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, name, email, phone, status, created_by, created_at
    `, [name, email, phone||null, status||'new', created_by]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/leads error', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PATCH update a lead
// PATCH /api/leads/:id
router.patch('/:id', async (req, res) => {
  const fields = ['name','email','phone','status','created_by'];
  const sets = [], vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(`
      UPDATE leads
      SET ${sets.join(', ')}
      WHERE id = $${vals.length}
      RETURNING id, name, email, phone, status, created_by, created_at
    `, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/leads/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE a lead
// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM leads WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Lead not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/leads/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;
