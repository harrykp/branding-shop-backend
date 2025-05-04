// branding-shop-backend/routes/quotes.js
const router = require('express').Router();
const db = require('../db');

// GET /api/quotes
router.get('/', async (req, res) => {
  const isAdmin = req.user.roles.includes('super_admin');
  let rows;
  if (isAdmin) {
    ({ rows } = await db.query(`
      SELECT q.id,u.name AS customer_name,q.total,q.status,q.created_at
      FROM quotes q
      JOIN users u ON u.id=q.user_id
      ORDER BY q.created_at DESC
    `));
  } else {
    ({ rows } = await db.query(`
      SELECT q.id,u.name AS customer_name,q.total,q.status,q.created_at
      FROM quotes q
      JOIN users u ON u.id=q.user_id
      WHERE q.user_id=$1
      ORDER BY q.created_at DESC
    `, [req.user.id]));
  }
  res.json(rows);
});

// POST /api/quotes
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { items } = req.body;
  const total = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);
  const { rows } = await db.query(
    `INSERT INTO quotes(user_id,total,status) VALUES($1,$2,'pending') RETURNING *`,
    [userId, total]
  );
  const quoteId = rows[0].id;
  for (let it of items) {
    await db.query(
      `INSERT INTO quote_items(quote_id,description,qty,unit_price)
       VALUES($1,$2,$3,$4)`,
      [quoteId, it.description, it.qty, it.unit_price]
    );
  }
  res.status(201).json(rows[0]);
});

module.exports = router;
