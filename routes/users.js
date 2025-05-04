const router = require('express').Router();
const db = require('../db');

// GET /api/users
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id,name,email,phone_number,department_id,created_at FROM users`
  );
  res.json(rows);
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id,name,email,phone_number,department_id,created_at FROM users WHERE id=$1`,
    [req.params.id]
  );
  res.json(rows[0]);
});

// POST /api/users
router.post('/', async (req, res) => {
  const { name, email, phone_number, password_hash, department_id } = req.body;
  const { rows } = await db.query(
    `INSERT INTO users(name,email,phone_number,password_hash,department_id)
     VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,phone_number,department_id`,
    [name, email, phone_number, password_hash, department_id]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  const fields = ['name','email','phone_number','password_hash','department_id'];
  const sets = fields.filter(f => f in req.body).map((f, i) => `${f}=$${i+1}`);
  const vals = fields.filter(f => f in req.body).map(f => req.body[f]);
  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
  const query =
    `UPDATE users SET ${sets.join(',')} WHERE id=$${sets.length+1}
     RETURNING id,name,email,phone_number,department_id`;
  const { rows } = await db.query(query, [...vals, req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

// GET /api/users/:id/roles
router.get('/:id/roles', async (req, res) => {
  const { rows } = await db.query(
    `SELECT r.id, r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id=r.id
     WHERE ur.user_id=$1`,
    [req.params.id]
  );
  res.json(rows);
});

// PATCH /api/users/:id/roles
router.patch('/:id/roles', async (req, res) => {
  const { roles } = req.body; // array of role IDs
  const userId = req.params.id;
  await db.query(`DELETE FROM user_roles WHERE user_id=$1`, [userId]);
  for (let roleId of roles) {
    await db.query(
      `INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)`,
      [userId, roleId]
    );
  }
  const { rows } = await db.query(
    `SELECT r.id, r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id=r.id
     WHERE ur.user_id=$1`,
    [userId]
  );
  res.json(rows);
});

module.exports = router;
