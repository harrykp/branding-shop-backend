const router = require('express').Router();
const db = require('../db');

// GET /api/roles
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM roles`);
  res.json(rows);
});

// POST /api/roles
router.post('/', async (req, res) => {
  const { name } = req.body;
  const { rows } = await db.query(
    `INSERT INTO roles(name) VALUES($1) RETURNING *`,
    [name]
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/roles/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM roles WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

