// branding-shop-backend/routes/production.js

const router = require('express').Router();
const db     = require('../db');

// GET all jobs
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        j.id,
        j.deal_id,
        j.order_id,
        o.status         AS order_status,
        j.type,
        j.qty,
        j.completed_qty,
        j.status,
        j.department_id,
        d.name           AS department_name,
        j.assigned_to,
        u.name           AS assignee_name,
        j.start_date,
        j.due_date,
        j.pushed_from_date,
        j.started_at,
        j.finished_at,
        j.comments,
        j.updated_by,
        updater.name     AS updated_by_name,
        j.updated_at
      FROM jobs j
      LEFT JOIN deals    dl ON dl.id = j.deal_id
      LEFT JOIN orders   o  ON o.id = j.order_id
      LEFT JOIN departments d  ON d.id = j.department_id
      LEFT JOIN users    u  ON u.id = j.assigned_to
      LEFT JOIN users    updater ON updater.id = j.updated_by
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
      `
      SELECT
        *
      FROM jobs
      WHERE id=$1
      `,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/jobs/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST create a job manually
router.post('/', async (req, res) => {
  const { order_id, type, qty, department_id, assigned_to, due_date } = req.body;
  if (!order_id || !type || !qty) {
    return res.status(400).json({ error: 'Missing order_id, type or qty' });
  }
  try {
    const { rows } = await db.query(
      `
      INSERT INTO jobs
        (order_id, type, qty, department_id, assigned_to, status, start_date, due_date, updated_by)
      VALUES
        ($1, $2, $3, $4, $5, 'queued', NOW(), $6, $7)
      RETURNING *
      `,
      [
        order_id,
        type,
        qty,
        department_id || null,
        assigned_to || null,
        due_date || null,
        req.user.id           // updated_by
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/jobs error', err);
    res.status(500).json({ error: err.message || 'Failed to create job' });
  }
});

// PATCH update job
router.patch('/:id', async (req, res) => {
  const updatable = [
    'status','assigned_to','due_date',
    'pushed_from_date','completed_qty','comments'
  ];
  const sets = [], vals = [];
  updatable.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f}=$${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  // always update updated_by + updated_at
  sets.push(`updated_by=$${sets.length+1}`);
  vals.push(req.user.id);

  vals.push(req.params.id);
  try {
    const { rows } = await db.query(
      `
      UPDATE jobs
      SET ${sets.join(',')}, updated_at = now()
      WHERE id = $${vals.length}
      RETURNING *
      `,
      vals
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Job not found' });
    }
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
    if (!rowCount) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/jobs/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ──────────────────────────────────────────────────────────────
// 1) Push a deal to production (managers & up only)
// POST /api/jobs/push/:dealId
router.post('/push/:dealId', async (req, res) => {
  try {
    // 1) Check manager role
    const { rows: userRoles } = await db.query(`
      SELECT r.name
      FROM user_roles ur
      JOIN roles r       ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `, [req.user.id]);
    const roleNames = userRoles.map(r => r.name);
    if (!roleNames.includes('manager')
        && !roleNames.includes('chief_executive')
        && !roleNames.includes('system_admin')
        && !roleNames.includes('super_admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2) Load deal → get quote_id & order_id (if exists)
    const { rows: deals } = await db.query(
      `SELECT id, quote_id, order_id FROM deals WHERE id = $1`,
      [req.params.dealId]
    );
    if (!deals[0]) return res.status(404).json({ error: 'Deal not found' });
    const deal = deals[0];

    // 3) Determine qty from quote
    const { rows: quotes } = await db.query(
      `SELECT quantity FROM quotes WHERE id = $1`,
      [deal.quote_id]
    );
    const qty = quotes[0]?.quantity || 0;

    // 4) Default department & assignee (could come from req.body)
    //    here we grab from deal or fallback to current user’s dept:
    const departmentId = req.body.department_id || req.user.department_id;
    const assignedTo   = req.body.assigned_to   || req.user.id;

    // 5) Insert the new production job
    const { rows: jobRows } = await db.query(`
      INSERT INTO jobs
        (deal_id, order_id, type, status, qty,
         department_id, assigned_to,
         start_date, due_date, updated_by)
      VALUES
        ($1,      $2,       'production', 'queued', $3,
         $4,           $5,
         NOW(),       NOW() + INTERVAL '1 day', $6)
      RETURNING *
    `, [
      deal.id,           // $1 → deals.id
      deal.order_id,     // $2 → may be NULL if not yet converted
      qty,               // $3 → quantity from quote
      departmentId,      // $4
      assignedTo,        // $5
      req.user.id        // $6 → updated_by
    ]);

    res.status(201).json(jobRows[0]);

  } catch (err) {
    console.error('POST /api/jobs/push/:dealId error', err);
    res.status(500).json({ error: 'Failed to push to production' });
  }
});

module.exports = router;
