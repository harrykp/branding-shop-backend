const router = require('express').Router();
const db = require('../db');

// GET /api/payments
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT pt.id,pt.order_id,u.name AS user,pt.gateway,pt.amount,pt.received_at
    FROM payment_transactions pt
    JOIN users u ON u.id=pt.user_id
    ORDER BY pt.received_at DESC
  `);
  res.json(rows);
});

// POST /api/payments
router.post('/', async (req, res) => {
  const { order_id, user_id, payment_type_id, gateway, amount, received_at } = req.body;
  const { rows } = await db.query(
    `INSERT INTO payment_transactions(order_id,user_id,payment_type_id,gateway,amount,received_at)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [order_id,user_id,payment_type_id,gateway,amount,received_at]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;

