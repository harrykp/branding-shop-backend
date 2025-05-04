// branding-shop-backend/routes/hr.js
const router = require('express').Router();
const db = require('../db');

// GET all HR info
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT h.id,u.name,h.ssn,h.position,h.salary,h.hire_date
    FROM hr_info h
    JOIN users u ON u.id=h.user_id
    ORDER BY h.user_id
  `);
  res.json(rows);
});

// PATCH update position/salary
router.patch('/:id', async (req, res) => {
  const fields = ['position','salary'];
  const sets = fields.filter(f=>f in req.body)
                     .map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const { rows } = await db.query(
    `UPDATE hr_info SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});

module.exports = router;
