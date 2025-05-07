// branding-shop-backend/routes/users.js
const router = require('express').Router();
const db = require('../db');

// GET list all users
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, email, phone_number, department_id, created_at
      FROM users
      ORDER BY id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/users error', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET single user by id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, email, phone_number, department_id, created_at
      FROM users
      WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/users/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST create new user
router.post('/', async (req, res) => {
  const { name, email, phone_number, department_id, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO users (name, email, phone_number, department_id, password_hash)
      VALUES ($1,$2,$3,$4, crypt($5, gen_salt('bf')))
      RETURNING id, name, email, phone_number, department_id, created_at
    `, [name, email, phone_number||null, department_id||null, password]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/users error', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH update user
router.patch('/:id', async (req, res) => {
  const fields = ['name','email','phone_number','department_id'];
  const sets = [];
  const vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f}=$${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'No updatable fields' });
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(`
      UPDATE users
      SET ${sets.join(', ')}
      WHERE id=$${vals.length}
      RETURNING id, name, email, phone_number, department_id, created_at
    `, vals);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/users/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'User not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/users/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
