// branding-shop-backend/routes/deals.js

const router = require('express').Router();
const db = require('../db');

// GET all deals
// GET /api/deals
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        lead_id,
        assigned_to,
        value,
        status,
        created_at
      FROM deals
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/deals error', err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET single deal
// GET /api/deals/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        id,
        lead_id,
        assigned_to,
        value,
        status,
        created_at
      FROM deals
      WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Deal not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/deals/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// POST create new deal
// POST /api/deals
router.post('/', async (req, res) => {
  const { lead_id, assigned_to, value, status } = req.body;
  if (!lead_id) {
    return res.status(400).json({ error: 'lead_id is required' });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO deals
        (lead_id, assigned_to, value, status)
      VALUES ($1,$2,$3,$4)
      RETURNING id, lead_id, assigned_to, value, status, created_at
    `, [lead_id, assigned_to||null, value||0, status||'qualified']);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/deals error', err);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// PATCH update deal
// PATCH /api/deals/:id
router.patch('/:id', async (req, res) => {
  const fields = ['lead_id','assigned_to','value','status'];
  const sets = [], vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length + 1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(`
      UPDATE deals
      SET ${sets.join(', ')}
      WHERE id = $${vals.length}
      RETURNING id, lead_id, assigned_to, value, status, created_at
    `, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Deal not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/deals/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// DELETE a deal
// DELETE /api/deals/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM deals WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Deal not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/deals/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

module.exports = router;
