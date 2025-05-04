const router = require('express').Router();
const db = require('../db');

// GET /api/orders
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT o.id,u.name AS customer_name,o.total,o.status,o.created_at
    FROM orders o
    JOIN users u ON u.id=o.user_id
    ORDER BY o.created_at DESC
  `);
  res.json(rows);
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM orders WHERE id=$1`, [req.params.id]);
  res.json(rows[0]);
});

// POST /api/orders
router.post('/', async (req, res) => {
  const { user_id, quote_id, items } = req.body;
  const total = items.reduce((sum,i)=> sum + i.unit_price*i.qty,0);
  const { rows } = await db.query(
    `INSERT INTO orders(user_id,quote_id,total,status) VALUES($1,$2,$3,'new') RETURNING *`,
    [user_id, quote_id, total]
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

// PATCH /api/orders/:id
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const { rows } = await db.query(
    `UPDATE orders SET status=$1 WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM orders WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

