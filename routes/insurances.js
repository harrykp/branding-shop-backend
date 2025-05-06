const router = require('express').Router();
const db     = require('../db');

// GET all insurance records
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        i.id,
        i.user_id,
        u.name           AS employee_name,
        i.provider,
        i.policy_number,
        i.coverage_details,
        i.started_at,
        i.created_at
      FROM insurances i
      JOIN users u ON u.id = i.user_id
      ORDER BY i.started_at DESC, i.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/insurances error', err);
    res.status(500).json({ error: 'Failed to fetch insurances' });
  }
});

// GET single insurance
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM insurances WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Insurance not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/insurances/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch insurance' });
  }
});

// POST create insurance record
router.post('/', async (req, res) => {
  const { user_id, provider, policy_number, coverage_details, started_at } = req.body;
  if (!user_id || !provider || !policy_number) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO insurances
         (user_id, provider, policy_number, coverage_details, started_at, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING *`,
      [user_id, provider, policy_number, coverage_details||null, started_at||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/insurances error', err);
    res.status(500).json({ error: 'Failed to create insurance' });
  }
});

// PATCH update insurance
router.patch('/:id', async (req, res) => {
  const fields = ['provider','policy_number','coverage_details','started_at'];
  const sets = [], vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'No updatable fields' });
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE insurances
       SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Insurance not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/insurances/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update insurance' });
  }
});

// DELETE insurance
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM insurances WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Insurance not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/insurances/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete insurance' });
  }
});

module.exports = router;
