const router = require('express').Router();
const db = require('../db');

// GET /api/users
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT id,name,email,department_id,created_at FROM users`);
  res.json(rows);
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id,name,email,department_id,created_at FROM users WHERE id=$1`,
    [req.params.id]
  );
  res.json(rows[0]);
});

// POST /api/users
router.post('/', async (req, res) => {
  const { name, email, password_hash, department_id } = req.body;
  const { rows } = await db.query(
    `INSERT INTO users(name,email,password_hash,department_id)
     VALUES($1,$2,$3,$4) RETURNING id,name,email,department_id`,
    [name, email, password_hash, department_id]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  const fields = ['name','email','password_hash','department_id'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  if (!sets.length) return res.status(400).json({ error:'No fields to update' });
  const query = `UPDATE users SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING id,name,email,department_id`;
  const { rows } = await db.query(query, [...vals, req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

