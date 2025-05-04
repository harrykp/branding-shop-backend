const router = require('express').Router();
const db = require('../db');

// GET /api/taxes
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM taxes`);
  res.json(rows);
});

// POST /api/taxes
router.post('/', async (req, res) => {
  const { name, rate, type } = req.body;
  const { rows } = await db.query(
    `INSERT INTO taxes(name,rate,type) VALUES($1,$2,$3) RETURNING *`,
    [name,rate,type]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/taxes/:id
router.patch('/:id', async (req, res) => {
  const fields = ['name','rate','type'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const query = `UPDATE taxes SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`;
  const { rows } = await db.query(query, [...vals, req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/taxes/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM taxes WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

