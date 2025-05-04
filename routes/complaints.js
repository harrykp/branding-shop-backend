const router = require('express').Router();
const db = require('../db');

// GET all complaints for this user (or all if admin)
router.get('/', async (req, res) => {
  // assume you decode JWT to get userId & roles; omitted for brevity
  const userId = req.user.id;
  const isAdmin = req.user.roles.includes('super_admin');
  const sql = isAdmin
    ? `SELECT * FROM complaints ORDER BY created_at DESC`
    : `SELECT * FROM complaints WHERE user_id=$1 ORDER BY created_at DESC`;
  const params = isAdmin ? [] : [userId];
  const { rows } = await db.query(sql, params);
  res.json(rows);
});

// POST a new complaint
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { order_id, complaint_text } = req.body;
  const { rows } = await db.query(
    `INSERT INTO complaints(user_id,order_id,complaint_text)
     VALUES($1,$2,$3) RETURNING *`,
    [userId, order_id, complaint_text]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
