// branding-shop-backend/routes/quotes.js
const router = require('express').Router();
const db = require('../db');

// GET all
router.get('/', async (req, res) => {
  const isAdmin = req.user.roles.includes('super_admin');
  const base = `
    SELECT q.id,u.name AS customer_name,q.total,q.status,q.created_at
    FROM quotes q
    JOIN users u ON u.id=q.user_id`;
  const where = isAdmin ? '' : 'WHERE q.user_id=$1';
  const params = isAdmin ? [] : [req.user.id];
  const { rows } = await db.query(`${base} ${where} ORDER BY q.created_at DESC`, params);
  res.json(rows);
});

// UPDATE status
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const { rows } = await db.query(
    `UPDATE quotes SET status=$1 WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM quotes WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
