const router = require('express').Router();
const db = require('../db');

// GET /api/suppliers
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM suppliers`);
  res.json(rows);
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  const { name, website } = req.body;
  const { rows } = await db.query(
    `INSERT INTO suppliers(name,website) VALUES($1,$2) RETURNING *`,
    [name,website]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/suppliers/:id
router.patch('/:id', async (req, res) => {
  const fields = ['name','website'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const query = `UPDATE suppliers SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`;
  const { rows } = await db.query(query,[...vals,req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM suppliers WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

