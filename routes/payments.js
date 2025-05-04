// branding-shop-backend/routes/payments.js
const router = require('express').Router();
const db = require('../db');

// GET /api/payments
router.get('/', async (req, res) => {
  const isAdmin = req.user.roles.includes('super_admin');
  let rows;
  if (isAdmin) {
    ({ rows } = await db.query(`
      SELECT pt.id,pt.order_id,u.name AS user,pt.gateway,pt.amount,pt.received_at
      FROM payment_transactions pt
      JOIN users u ON u.id=pt.user_id
      ORDER BY pt.received_at DESC
    `));
  } else {
    ({ rows } = await db.query(`
      SELECT pt.id,pt.order_id,u.name AS user,pt.gateway,pt.amount,pt.received_at
      FROM payment_transactions pt
      JOIN users u ON u.id=pt.user_id
      WHERE pt.user_id=$1
      ORDER BY pt.received_at DESC
    `, [req.user.id]));
  }
  res.json(rows);
});

// POST /api/payments
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { order_id, payment_type_id, gateway, amount } = req.body;
  const { rows } = await db.query(
    `INSERT INTO payment_transactions(order_id,user_id,payment_type_id,gateway,amount)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [order_id, userId, payment_type_id, gateway, amount]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
