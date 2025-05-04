// branding-shop-backend/routes/reports_finance.js
const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const pay = await db.query(`SELECT SUM(amount)::numeric(12,2) AS total_received FROM payment_transactions`);
  const exp = await db.query(`SELECT SUM(amount)::numeric(12,2) AS total_expenses FROM expenses`);
  res.json({
    total_received: pay.rows[0].total_received || 0,
    total_expenses: exp.rows[0].total_expenses || 0
  });
});

module.exports = router;
