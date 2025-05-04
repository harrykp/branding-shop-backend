const router = require('express').Router();
const db = require('../db');

// GET /api/hr
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT h.id,h.user_id,u.name,h.ssn,h.hire_date,h.position,h.salary
    FROM hr_info h
    JOIN users u ON u.id=h.user_id
  `);
  res.json(rows);
});

// POST /api/hr
router.post('/', async (req, res) => {
  const { user_id, ssn, hire_date, position, salary } = req.body;
  const { rows } = await db.query(
    `INSERT INTO hr_info(user_id,ssn,hire_date,position,salary)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [user_id,ssn,hire_date,position,salary]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/hr/:id
router.patch('/:id', async (req, res) => {
  const fields = ['ssn','hire_date','position','salary'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const query = `UPDATE hr_info SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`;
  const { rows } = await db.query(query,[...vals,req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/hr/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM hr_info WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

