// branding-shop-backend/routes/crm.js
const router = require('express').Router();
const db = require('../db');

// LEADS
router.get('/leads', async (req, res) => {
  const { rows } = await db.query(`
    SELECT * FROM leads ORDER BY created_at DESC
  `);
  res.json(rows);
});
router.post('/leads', async (req, res) => {
  const { name,email,phone,status } = req.body;
  const { rows } = await db.query(
    `INSERT INTO leads(created_by,name,email,phone,status)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [req.user.id,name,email,phone,status]
  );
  res.status(201).json(rows[0]);
});
router.delete('/leads/:id', async (req, res) => {
  await db.query(`DELETE FROM leads WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

// DEALS
router.get('/deals', async (req, res) => {
  const { rows } = await db.query(`
    SELECT * FROM deals ORDER BY created_at DESC
  `);
  res.json(rows);
});
router.post('/deals', async (req, res) => {
  const { lead_id,value,status } = req.body;
  const { rows } = await db.query(
    `INSERT INTO deals(lead_id,assigned_to,value,status)
     VALUES($1,$2,$3,$4) RETURNING *`,
    [lead_id, req.user.id, value, status]
  );
  res.status(201).json(rows[0]);
});
router.delete('/deals/:id', async (req, res) => {
  await db.query(`DELETE FROM deals WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
