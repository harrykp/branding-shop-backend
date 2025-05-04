// branding-shop-backend/routes/expenses.js
const router = require('express').Router();
const db = require('../db');

// GET all
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT * FROM expenses ORDER BY expense_date DESC
  `);
  res.json(rows);
});

// CREATE
router.post('/', async (req, res) => {
  const { amount,category,description,expense_date } = req.body;
  const { rows } = await db.query(
    `INSERT INTO expenses(user_id,amount,category,description,expense_date)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [req.user.id,amount,category,description,expense_date]
  );
  res.status(201).json(rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM expenses WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
