// branding-shop-backend/routes/reports_sales.js
const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT to_char(created_at,'YYYY-MM') AS month,
           SUM(total)::numeric(12,2) AS total_sales
    FROM orders
    GROUP BY month ORDER BY month;
  `);
  res.json(rows);
});

module.exports = router;
