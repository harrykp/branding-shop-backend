const router = require('express').Router();
const db = require('../db');

// GET /api/quotes
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT q.id,u.name AS customer_name,q.total,q.status,q.created_at
    FROM quotes q
    JOIN users u ON u.id=q.user_id
    ORDER BY q.created_at DESC
  `);
  res.json(rows);
});

// GET /api/quotes/:id
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM quotes WHERE id=$1`, [req.params.id]);
  res.json(rows[0]);
});

// POST /api/quotes
router.post('/', async (req, res) => {
  const { user_id, items } = req.body;
  const total = items.reduce((sum,i)=>sum + i.unit_price*i.qty,0);
  const { rows } = await db.query(
    `INSERT INTO quotes(user_id,total,status) VALUES($1,$2,'pending') RETURNING *`,
    [user_id,total]
  );
  const quoteId = rows[0].id;
  for (let it of items) {
    await db.query(
      `INSERT INTO quote_items(quote_id,description,qty,unit_price)
       VALUES($1,$2,$3,$4)`,
      [quoteId,it.description,it.qty,it.unit_price]
    );
  }
  res.status(201).json(rows[0]);
});

// PATCH /api/quotes/:id
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const { rows } = await db.query(
    `UPDATE quotes SET status=$1 WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/quotes/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM quotes WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

