// branding-shop-backend/routes/orders.js
const router = require('express').Router();
const db = require('../db');

// GET /api/orders
router.get('/', async (req, res) => {
  const isAdmin = req.user.roles.includes('super_admin');
  let rows;
  if (isAdmin) {
    ({ rows } = await db.query(`
      SELECT o.id,u.name AS customer_name,o.total,o.status,o.created_at
      FROM orders o
      JOIN users u ON u.id=o.user_id
      ORDER BY o.created_at DESC
    `));
  } else {
    ({ rows } = await db.query(`
      SELECT o.id,u.name AS customer_name,o.total,o.status,o.created_at
      FROM orders o
      JOIN users u ON u.id=o.user_id
      WHERE o.user_id=$1
      ORDER BY o.created_at DESC
    `, [req.user.id]));
  }
  res.json(rows);
});

// POST /api/orders
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { items } = req.body;
  const total = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);
  const { rows } = await db.query(
    `INSERT INTO orders(user_id,quote_id,total,status)
     VALUES($1,NULL,$2,'new') RETURNING *`,
    [userId, total]
  );
  const orderId = rows[0].id;
  for (let it of items) {
    await db.query(
      `INSERT INTO order_items(order_id,description,qty,unit_price)
       VALUES($1,$2,$3,$4)`,
      [orderId, it.description, it.qty, it.unit_price]
    );
  }
  res.status(201).json(rows[0]);
});

module.exports = router;
