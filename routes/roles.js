// branding-shop-backend/routes/roles.js
const router = require('express').Router();
const db = require('../db');

// GET all roles
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id, name FROM roles ORDER BY id`);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/roles error', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET single role
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name FROM roles WHERE id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Role not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/roles/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// POST new role
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO roles (name) VALUES ($1) RETURNING id, name`,
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/roles error', err);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PATCH update role
router.patch('/:id', async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'Name is required' });
  try {
    const { rows } = await db.query(
      `UPDATE roles SET name=$1 WHERE id=$2 RETURNING id, name`,
      [req.body.name, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Role not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/roles/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE role
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM roles WHERE id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Role not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/roles/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

module.exports = router;
