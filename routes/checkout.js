// branding-shop-backend/routes/checkout.js
const router = require('express').Router();
const db = require('../db');

/**
 * GET /api/cart
 * Returns all items in the current user’s cart
 */
router.get('/cart', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ci.id, ci.product_id, p.name AS product_name, p.price, ci.quantity
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = $1
        ORDER BY ci.id`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/cart error', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

/**
 * POST /api/cart
 * { product_id, quantity }
 * Adds or updates a cart item for the current user
 */
router.post('/cart', async (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'Missing product_id or quantity' });
  }
  try {
    // upsert: if exists, update qty; else insert
    const { rows } = await db.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES ($1,$2,$3)
       ON CONFLICT (user_id, product_id)
         DO UPDATE SET quantity = EXCLUDED.quantity
       RETURNING *`,
      [req.user.id, product_id, quantity]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/cart error', err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

/**
 * DELETE /api/cart/:id
 * Removes a cart item by its cart_items.id
 */
router.delete('/cart/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM cart_items
        WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Cart item not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error('DELETE /api/cart/:id error', err);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

/**
 * POST /api/checkout
 * Creates an Order + OrderItems for everything in the user’s cart,
 * then clears the cart. Returns the new order.
 */
router.post('/', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1) fetch cart
    const cartRes = await client.query(
      `SELECT ci.product_id, ci.quantity, p.price
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = $1`,
      [req.user.id]
    );
    const cart = cartRes.rows;
    if (!cart.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // 2) compute total
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // 3) insert order
    const orderRes = await client.query(
      `INSERT INTO orders
         (quote_id, user_id, total, status, payment_status)
       VALUES (NULL, $1, $2, 'new', 'pending')
       RETURNING id, quote_id, user_id AS customer_id, total, status, placed_at, payment_status`,
      [req.user.id, total]
    );
    const order = orderRes.rows[0];

    // 4) insert order_items
    const insertItemText = `
      INSERT INTO order_items
        (order_id, product_id, quantity, unit_price)
      VALUES ($1,$2,$3,$4)
    `;
    for (const item of cart) {
      await client.query(insertItemText,
        [order.id, item.product_id, item.quantity, item.price]);
    }

    // 5) clear cart
    await client.query(
      `DELETE FROM cart_items WHERE user_id = $1`,
      [req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ order });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/checkout error', err);
    res.status(500).json({ error: 'Checkout failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
