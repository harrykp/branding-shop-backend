// branding-shop-backend/routes/reports_taxes.js
const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT t.name AS tax, SUM(ot.amount)::numeric(12,2) AS total
    FROM order_taxes ot
    JOIN taxes t ON ot.tax_id=t.id
    GROUP BY t.name ORDER BY t.name;
  `);
  res.json(rows);
});

module.exports = router;
