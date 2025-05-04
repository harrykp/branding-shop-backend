// branding-shop-backend/routes/roles.js
const router = require('express').Router();
const db = require('../db');

// GET all roles
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT id,name FROM roles ORDER BY id`);
  res.json(rows);
});

// POST create
router.post('/', async (req, res) => {
  const { name } = req.body;
  const { rows } = await db.query(
    `INSERT INTO roles(name) VALUES($1) RETURNING id,name`, [name]
  );
  res.status(201).json(rows[0]);
});

// PATCH update
router.patch('/:id', async (req, res) => {
  const { name } = req.body;
  const { rows } = await db.query(
    `UPDATE roles SET name=$1 WHERE id=$2 RETURNING id,name`,
    [name, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM roles WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
