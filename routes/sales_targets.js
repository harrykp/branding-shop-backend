const router = require('express').Router();
const db = require('../db');

// GET /api/targets
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM sales_targets ORDER BY period_start DESC`);
  res.json(rows);
});

// POST /api/targets
router.post('/', async (req, res) => {
  const { user_id, period_start, period_end, target_amount } = req.body;
  const { rows } = await db.query(
    `INSERT INTO sales_targets(user_id,period_start,period_end,target_amount)
     VALUES($1,$2,$3,$4) RETURNING *`,
    [user_id,period_start,period_end,target_amount]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/targets/:id
router.patch('/:id', async (req, res) => {
  const fields = ['period_start','period_end','target_amount'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const query = `UPDATE sales_targets SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`;
  const { rows } = await db.query(query,[...vals,req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/targets/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM sales_targets WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

