const router = require('express').Router();
const db = require('../db');

// GET /api/jobs
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT j.id,j.type,j.status,d.name AS department,u.name AS assigned_to,j.qty,
           j.start_date,j.due_date,j.started_at,j.finished_at
    FROM jobs j
    LEFT JOIN departments d ON d.id=j.department_id
    LEFT JOIN users u ON u.id=j.assigned_to
    ORDER BY j.due_date
  `);
  res.json(rows);
});

// POST /api/jobs
router.post('/', async (req, res) => {
  const { order_id, type, department_id, assigned_to, qty, start_date, due_date } = req.body;
  const { rows } = await db.query(
    `INSERT INTO jobs(order_id,type,department_id,assigned_to,qty,start_date,due_date)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [order_id,type,department_id,assigned_to,qty,start_date,due_date]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/jobs/:id
router.patch('/:id', async (req, res) => {
  const fields = ['status','assigned_to','started_at','finished_at','pushed_from_date'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const query = `UPDATE jobs SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`;
  const { rows } = await db.query(query,[...vals,req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/jobs/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM jobs WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

