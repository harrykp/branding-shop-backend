const router = require('express').Router();
const db = require('../db');

// GET /api/daily-transactions
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM daily_transactions ORDER BY date DESC`);
  res.json(rows);
});

// POST /api/daily-transactions
router.post('/', async (req, res) => {
  const { date, start_of_day_cash, payments_received, expenses_paid, bank_deposit, end_of_day_cash, updated_by } = req.body;
  const { rows } = await db.query(
    `INSERT INTO daily_transactions(date,start_of_day_cash,payments_received,expenses_paid,bank_deposit,end_of_day_cash,updated_by)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [date,start_of_day_cash,payments_received,expenses_paid,bank_deposit,end_of_day_cash,updated_by]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/daily-transactions/:date
router.patch('/:date', async (req, res) => {
  const fields = ['start_of_day_cash','payments_received','expenses_paid','bank_deposit','end_of_day_cash','updated_by'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const query = `UPDATE daily_transactions SET ${sets.join(',')} WHERE date=$${sets.length+1} RETURNING *`;
  const { rows } = await db.query(query, [...vals, req.params.date]);
  res.json(rows[0]);
});

// DELETE /api/daily-transactions/:date
router.delete('/:date', async (req, res) => {
  await db.query(`DELETE FROM daily_transactions WHERE date=$1`, [req.params.date]);
  res.status(204).end();
});

module.exports = router;

