// branding-shop-backend/routes/cart.js
const router = require('express').Router();
const db = require('../db');

// GET /api/cart – list this user's cart items
router.get('/', async (req, res) => {
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

// POST /api/cart – add to cart (or increment if exists)
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'Missing product_id or quantity' });
  }

  // check existing
  const { rows: existing } = await db.query(
    `SELECT id, quantity FROM cart_items WHERE user_id=$1 AND product_id=$2`,
    [userId, product_id]
  );
  if (existing[0]) {
    const newQty = existing[0].quantity + quantity;
    const { rows } = await db.query(
      `UPDATE cart_items
         SET quantity=$1, updated_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [newQty, existing[0].id]
    );
    return res.json(rows[0]);
  }

  // otherwise insert
  const { rows } = await db.query(
    `INSERT INTO cart_items
       (user_id, product_id, quantity, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [userId, product_id, quantity]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/cart/:id – update quantity
router.patch('/:id', async (req, res) => {
  const { quantity } = req.body;
  const { rows } = await db.query(
    `UPDATE cart_items
       SET quantity=$1, updated_at=NOW()
     WHERE id=$2
     RETURNING *`,
    [quantity, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// DELETE /api/cart/:id – remove item
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(
    `DELETE FROM cart_items WHERE id=$1`,
    [req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.sendStatus(204);
});

module.exports = router;
