// branding-shop-backend/routes/production.js
const router = require('express').Router();
const db = require('../db');

// GET all jobs
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT j.*, d.name AS department, u.name AS assigned_to_name
    FROM jobs j
    LEFT JOIN departments d ON j.department_id=d.id
    LEFT JOIN users u ON j.assigned_to=u.id
    ORDER BY j.id
  `);
  res.json(rows);
});

// UPDATE (status, due_date, qty, etc)
router.patch('/:id', async (req, res) => {
  const fields = ['status','due_date','qty','assigned_to'];
  const sets = fields.filter(f=>f in req.body)
                     .map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  if (!sets.length) return res.status(400).json({ error:'No fields' });
  const { rows } = await db.query(
    `UPDATE jobs SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM jobs WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
