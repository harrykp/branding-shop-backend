// branding-shop-backend/routes/payments.js
const router = require('express').Router();
const db = require('../db');

// GET all
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT pt.id, pt.order_id, u.name AS user, pt.gateway, pt.amount, pt.received_at
    FROM payment_transactions pt
    JOIN users u ON u.id=pt.user_id
    ORDER BY pt.received_at DESC
  `);
  res.json(rows);
});

// CREATE
router.post('/', async (req, res) => {
  const { order_id,payment_type_id,gateway,amount } = req.body;
  const { rows } = await db.query(
    `INSERT INTO payment_transactions(order_id,user_id,payment_type_id,gateway,amount)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [order_id,req.user.id,payment_type_id,gateway,amount]
  );
  res.status(201).json(rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM payment_transactions WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
