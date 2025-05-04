const router = require('express').Router();
const db = require('../db');

// GET /api/commissions
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM commissions ORDER BY computed_at DESC`);
  res.json(rows);
});

// POST /api/commissions
router.post('/', async (req, res) => {
  const { order_id, agent_id, sales_rep_id, rate, amount } = req.body;
  const { rows } = await db.query(
    `INSERT INTO commissions(order_id,agent_id,sales_rep_id,rate,amount)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [order_id, agent_id, sales_rep_id, rate, amount]
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/commissions/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM commissions WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

