// branding-shop-backend/routes/checkout.js
const router = require('express').Router();
const db = require('../db');

// GET /api/checkout/cart – same as /api/cart but under checkout
router.get('/cart', async (req, res) => {
  const userId = req.user.id;
  const { rows } = await db.query(`
    SELECT
      ci.id,
      ci.product_id,
      p.name   AS product_name,
      p.price  AS unit_price,
      ci.quantity,
      (p.price * ci.quantity) AS total_price
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = $1
  `, [userId]);
  res.json(rows);
});

// POST /api/checkout – place order from cart
router.post('/', async (req, res) => {
  const userId = req.user.id;
  // 1) load cart
  const { rows: items } = await db.query(`
    SELECT ci.product_id, ci.quantity, p.price
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = $1
  `, [userId]);
  if (!items.length) return res.status(400).json({ error: 'Cart is empty' });

  // 2) compute total
  const total = items.reduce((sum, i) => sum + i.quantity * parseFloat(i.price), 0);

  // 3) create order
  const { rows: orderRows } = await db.query(`
    INSERT INTO orders
      (quote_id, user_id, total, status, payment_status, placed_at)
    VALUES
      (NULL, $1, $2, 'new', 'pending', NOW())
    RETURNING id
  `, [userId, total]);
  const orderId = orderRows[0].id;

  // 4) insert order_items
  for (const i of items) {
    await db.query(`
      INSERT INTO order_items
        (order_id, product_id, quantity, unit_price, created_at)
      VALUES ($1,$2,$3,$4,NOW())
    `, [orderId, i.product_id, i.quantity, i.price]);
  }

  // 5) clear cart
  await db.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);

  res.json({ id: orderId });
});

module.exports = router;
