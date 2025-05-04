// branding-shop-backend/routes/orders.js
const router = require('express').Router();
const db = require('../db');

// GET all
router.get('/', async (req, res) => {
  const isAdmin = req.user.roles.includes('super_admin');
  const base = `
    SELECT o.id,u.name AS customer_name,o.total,o.status,o.created_at
    FROM orders o
    JOIN users u ON u.id=o.user_id`;
  const where = isAdmin ? '' : 'WHERE o.user_id=$1';
  const params = isAdmin ? [] : [req.user.id];
  const { rows } = await db.query(`${base} ${where} ORDER BY o.created_at DESC`, params);
  res.json(rows);
});

// UPDATE status
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const { rows } = await db.query(
    `UPDATE orders SET status=$1 WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM orders WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
