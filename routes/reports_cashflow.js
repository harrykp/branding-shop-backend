// branding-shop-backend/routes/reports_cashflow.js
const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT date,start_of_day_cash,payments_received,expenses_paid,bank_deposit,end_of_day_cash
    FROM daily_transactions
    ORDER BY date;
  `);
  res.json(rows);
});

module.exports = router;
