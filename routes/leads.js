// branding-shop-backend/routes/leads.js
const router = require('express').Router();
const db = require('../db');

// GET /api/leads
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM leads ORDER BY created_at DESC`);
  res.json(rows);
});

// POST /api/leads
router.post('/', async (req, res) => {
  const { name,email,phone,status } = req.body;
  const { rows } = await db.query(
    `INSERT INTO leads(created_by,name,email,phone,status)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [req.user.id,name,email,phone,status]
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM leads WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
