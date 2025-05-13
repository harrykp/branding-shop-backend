// branding-shop-backend/routes/cart.js

const router = require('express').Router();
const db = require('../db');

/**
 * GET /api/cart
 * Returns all cart items for the current user.
 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        ci.id,
        ci.product_id,
        p.name        AS product_name,
        p.price       AS unit_price,
        ci.quantity,
        (p.price * ci.quantity) AS total_price
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/cart error', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

/**
 * POST /api/cart
 * Body: { product_id, quantity }
 * Add a new item or increase quantity if already in cart.
 */
router.post('/', async (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'Missing product_id or quantity' });
  }
  try {
    // see if exists
    const existing = await db.query(
      `SELECT id, quantity FROM cart_items
       WHERE user_id=$1 AND product_id=$2`,
      [req.user.id, product_id]
    );
    if (existing.rows[0]) {
      const newQty = existing.rows[0].quantity + quantity;
      const { rows } = await db.query(
        `UPDATE cart_items
           SET quantity=$1, updated_at=now()
         WHERE id=$2
         RETURNING *`,
        [newQty, existing.rows[0].id]
      );
      return res.status(200).json(rows[0]);
    }
    // insert new
    const { rows } = await db.query(
      `INSERT INTO cart_items
         (user_id, product_id, quantity)
       VALUES ($1,$2,$3)
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
 * PATCH /api/cart/:id
 * Body: { quantity }
 * Update quantity for an existing cart item.
 */
router.patch('/:id', async (req, res) => {
  const { quantity } = req.body;
  if (quantity == null) {
    return res.status(400).json({ error: 'Missing quantity' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE cart_items
         SET quantity=$1, updated_at=now()
       WHERE id=$2 AND user_id=$3
       RETURNING *`,
      [quantity, req.params.id, req.user.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/cart/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

/**
 * DELETE /api/cart/:id
 * Remove an item from the cart.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM cart_items WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/cart/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

module.exports = router;
