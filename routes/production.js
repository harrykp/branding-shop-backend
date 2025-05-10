// branding-shop-backend/routes/production.js

const router = require('express').Router();
const db     = require('../db');

// GET all jobs
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        j.id,
        j.order_id,
        o.status            AS order_status,
        j.type,
        j.qty,
        j.status            AS job_status,
        j.assigned_to,
        u.name              AS assignee_name,
        j.start_date,
        j.due_date,
        j.started_at,
        j.finished_at
      FROM jobs j
      LEFT JOIN orders      o ON o.id = j.order_id
      LEFT JOIN users       u ON u.id = j.assigned_to
      ORDER BY j.due_date ASC, j.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/jobs error', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET single job
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/jobs/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST create a job
router.post('/', async (req, res) => {
  const { order_id, type, qty, assigned_to, due_date } = req.body;
  if (!type || !qty) {
    return res.status(400).json({ error: 'Missing type or qty' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO jobs
         (order_id, type, qty, assigned_to, status, start_date, due_date)
       VALUES ($1, $2, $3, $4, 'queued', NOW(), $5)
       RETURNING *`,
      [order_id || null, type, qty, assigned_to || null, due_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/jobs error', err);
    res.status(500).json({ error: err.message || 'Failed to create job' });
  }
});

// PATCH update job
router.patch('/:id', async (req, res) => {
  const updatable = ['status','assigned_to','due_date','started_at','finished_at'];
  const sets = [], vals = [];
  updatable.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE jobs
       SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/jobs/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE job
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM jobs WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Job not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/jobs/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ──────────────────────────────────────────────────────────────
// Push a deal to production (by roles)
// POST /api/jobs/push/:dealId
router.post('/push/:dealId', async (req, res) => {
  try {
    // 1) Check  roles
    const { rows: userRoles } = await db.query(`
      SELECT r.name
      FROM user_roles ur
      JOIN roles r       ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `, [req.user.id]);
    const roleNames = userRoles.map(r => r.name);
    if (!roleNames.includes('employee') &&
        !roleNames.includes('sales_rep') &&
        !roleNames.includes('manager') &&
        !roleNames.includes('chief_executive') &&
        !roleNames.includes('system_admin') &&
        !roleNames.includes('super_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2) Load the deal and its quote
    const { rows: deals } = await db.query(
      `SELECT id, quote_id, assigned_to
       FROM deals
       WHERE id = $1`,
      [req.params.dealId]
    );
    if (!deals[0]) return res.status(404).json({ error: 'Deal not found' });
    const deal = deals[0];

    // 3) Lookup the quote’s quantity (default 0)
    const { rows: quotes } = await db.query(
      `SELECT quantity
       FROM quotes
       WHERE id = $1`,
      [deal.quote_id]
    );
    const qty = quotes[0]?.quantity || 0;

    // 4) Define insert values
    const orderId    = null;               // no order
    const assignedTo = deal.assigned_to    // use deal’s assignee
                      || req.user.id;      // or fallback to current user

    // 5) Insert into jobs table (no department_id)
    const { rows: jobRows } = await db.query(`
      INSERT INTO jobs
        (order_id, type, qty, assigned_to, start_date, due_date, status)
      VALUES
        ($1, 'production', $2, $3, NOW(), NOW() + INTERVAL '1 day', 'queued')
      RETURNING *
    `, [
      orderId,
      qty,
      assignedTo
    ]);

    res.status(201).json(jobRows[0]);
  } catch (err) {
    console.error('POST /api/jobs/push/:dealId error', err);
    res.status(500).json({ error: 'Failed to push to production' });
  }
});

module.exports = router;
