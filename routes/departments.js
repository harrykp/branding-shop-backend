const router = require('express').Router();
const db = require('../db');

// GET /api/departments
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM departments`);
  res.json(rows);
});

// POST /api/departments
router.post('/', async (req, res) => {
  const { name } = req.body;
  const { rows } = await db.query(
    `INSERT INTO departments(name) VALUES($1) RETURNING *`,
    [name]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/departments/:id
router.patch('/:id', async (req, res) => {
  const { name } = req.body;
  const { rows } = await db.query(
    `UPDATE departments SET name=$1 WHERE id=$2 RETURNING *`,
    [name, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/departments/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM departments WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

