// branding-shop-backend/routes/deals.js
const router = require('express').Router();
const db = require('../db');

// GET /api/deals
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM deals ORDER BY created_at DESC`);
  res.json(rows);
});

// POST /api/deals
router.post('/', async (req, res) => {
  const { lead_id,value,status } = req.body;
  const { rows } = await db.query(
    `INSERT INTO deals(lead_id,assigned_to,value,status)
     VALUES($1,$2,$3,$4) RETURNING *`,
    [lead_id, req.user.id, value, status]
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/deals/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM deals WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
