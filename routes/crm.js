const router = require('express').Router();
const db = require('../db');

// Determine table from mount point
function tableName(req) {
  return req.baseUrl.split('/').pop(); // 'leads' or 'deals'
}

// GET /api/leads & /api/deals
router.get('/', async (req, res) => {
  const table = tableName(req);
  const { rows } = await db.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  res.json(rows);
});

// POST /api/leads & /api/deals
router.post('/', async (req, res) => {
  const table = tableName(req);
  const cols = Object.keys(req.body);
  const vals = Object.values(req.body);
  const placeholders = cols.map((_,i)=>`$${i+1}`);
  const { rows } = await db.query(
    `INSERT INTO ${table}(${cols.join(',')})
     VALUES(${placeholders.join(',')}) RETURNING *`,
    vals
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/leads/:id & /api/deals/:id
router.patch('/:id', async (req, res) => {
  const table = tableName(req);
  const cols = Object.keys(req.body);
  const vals = Object.values(req.body);
  const sets = cols.map((c,i)=>`${c}=$${i+1}`);
  const query = `UPDATE ${table} SET ${sets.join(',')} WHERE id=$${cols.length+1} RETURNING *`;
  const { rows } = await db.query(query, [...vals, req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/leads/:id & /api/deals/:id
router.delete('/:id', async (req, res) => {
  const table = tableName(req);
  await db.query(`DELETE FROM ${table} WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

