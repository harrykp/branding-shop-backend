// branding-shop-backend/routes/suppliers.js
const router = require('express').Router();
const db = require('../db');

// GET all suppliers
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT id,name,website FROM suppliers ORDER BY name
  `);
  res.json(rows);
});

// (You can add POST/PATCH/DELETE similarly if needed)

module.exports = router;
