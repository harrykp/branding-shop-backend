// branding-shop-backend/routes/users.js
const router = require('express').Router();
const db = require('../db');

// GET all users
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id,name,email,phone_number,department_id,created_at
     FROM users ORDER BY id`
  );
  res.json(rows);
});

// GET one user
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id,name,email,phone_number,department_id,created_at
     FROM users WHERE id=$1`, [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// CREATE (via auth/register)

// PATCH update
router.patch('/:id', async (req, res) => {
  const fields = ['name','email','phone_number','department_id'];
  const sets = fields.filter(f=>f in req.body)
                     .map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body)
                     .map(f=>req.body[f]);
  if (!sets.length) return res.status(400).json({ error:'No fields' });
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING id,name,email,phone_number,department_id`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

// GET roles
router.get('/:id/roles', async (req, res) => {
  const { rows } = await db.query(
    `SELECT r.id,r.name
     FROM user_roles ur
     JOIN roles r ON r.id=ur.role_id
     WHERE ur.user_id=$1`, [req.params.id]
  );
  res.json(rows);
});

// PATCH roles
router.patch('/:id/roles', async (req, res) => {
  const userId = req.params.id;
  await db.query(`DELETE FROM user_roles WHERE user_id=$1`, [userId]);
  for (let rid of req.body.roles||[]) {
    await db.query(
      `INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)`,
      [userId,rid]
    );
  }
  const { rows } = await db.query(
    `SELECT r.id,r.name
     FROM user_roles ur
     JOIN roles r ON r.id=ur.role_id
     WHERE ur.user_id=$1`, [userId]
  );
  res.json(rows);
});

module.exports = router;
