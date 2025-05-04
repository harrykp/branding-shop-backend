// branding-shop-backend/routes/reports_leave.js
const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT user_id, COUNT(*) AS leave_count
    FROM vacations
    GROUP BY user_id ORDER BY user_id;
  `);
  res.json(rows);
});

module.exports = router;
