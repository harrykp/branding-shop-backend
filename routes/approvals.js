const router = require('express').Router();
const db = require('../db');

// GET /api/approvals
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT aa.id,aa.job_id,aa.approved,aa.approved_at,aa.comments
    FROM artwork_approvals aa
  `);
  res.json(rows);
});

// POST /api/approvals
router.post('/', async (req, res) => {
  const { job_id, approved, comments } = req.body;
  const { rows } = await db.query(
    `INSERT INTO artwork_approvals(job_id,approved,comments)
     VALUES($1,$2,$3) RETURNING *`,
    [job_id,approved,comments]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/approvals/:id
router.patch('/:id', async (req, res) => {
  const { approved, comments } = req.body;
  const { rows } = await db.query(
    `UPDATE artwork_approvals SET approved=$1,comments=$2,approved_at=now()
     WHERE id=$3 RETURNING *`,
    [approved,comments,req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/approvals/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM artwork_approvals WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

