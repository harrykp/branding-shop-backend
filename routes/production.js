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
        o.status           AS order_status,
        j.type,
        j.qty,
        j.status,
        j.department_id,
        d.name             AS department_name,
        j.assigned_to,
        u.name             AS assignee_name,
        j.start_date,
        j.due_date,
        j.pushed_from_date,
        j.started_at,
        j.finished_at,
        j.completed_qty,
        j.comments,
        j.updated_by,
        j.updated_at
      FROM jobs j
      LEFT JOIN orders     o ON o.id = j.order_id
      LEFT JOIN departments d ON d.id = j.department_id
      LEFT JOIN users      u ON u.id = j.assigned_to
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
      `SELECT * FROM jobs WHERE id=$1`,
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
  const { order_id, type, qty, department_id, assigned_to, due_date } = req.body;
  if (!order_id || !type || !qty) {
    return res.status(400).json({ error: 'Missing order_id, type or qty' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO jobs
         (order_id, type, qty, department_id, assigned_to, status, due_date)
       VALUES ($1,$2,$3,$4,$5,'queued',$6)
       RETURNING *`,
      [ order_id, type, qty, department_id||null, assigned_to||null, due_date||null ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/jobs error', err);
    res.status(500).json({ error: err.message || 'Failed to create job' });
  }
});

// PATCH update job
router.patch('/:id', async (req, res) => {
  const updatable = ['status','assigned_to','due_date','pushed_from_date','completed_qty','comments'];
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
// Push a deal to production (managers & up only)
// POST /api/jobs/push/:dealId
router.post('/push/:dealId', async (req, res) => {
  try {
    const dealId = parseInt(req.params.dealId, 10);

    // 1) Check manager‐level role
    const { rows: userRoles } = await db.query(`
      SELECT r.name
      FROM user_roles ur
      JOIN roles r       ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `, [req.user.id]);
    const roleNames = userRoles.map(r => r.name);
    const allowed = ['manager','chief_executive','system_admin','super_admin'];
    if (!roleNames.some(r => allowed.includes(r))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2) Load deal → get its quote_id & sales rep (assigned_to)
    const { rows: deals } = await db.query(
      `SELECT quote_id, assigned_to FROM deals WHERE id = $1`,
      [dealId]
    );
    if (!deals[0]) return res.status(404).json({ error: 'Deal not found' });
    const { quote_id: quoteId, assigned_to } = deals[0];

    // 3) Find the order that came from that quote
    const { rows: orders } = await db.query(
      `SELECT id, department_id FROM orders WHERE quote_id = $1`,
      [quoteId]
    );
    if (!orders[0]) {
      return res.status(400).json({ error: 'No order found for that quote' });
    }
    const orderId      = orders[0].id;
    const departmentId = orders[0].department_id;

    // 4) Lookup the quote’s quantity
    const { rows: quotes } = await db.query(
      `SELECT quantity FROM quotes WHERE id = $1`,
      [quoteId]
    );
    const qty = quotes[0]?.quantity || 0;

    // 5) Insert the new production job
    const { rows: jobRows } = await db.query(`
      INSERT INTO jobs
        (order_id, type, status, qty, department_id, assigned_to, start_date, due_date)
      VALUES
        ($1, 'production', 'queued', $2, $3, $4, NOW(), NOW() + INTERVAL '1 day')
      RETURNING *
    `, [
      orderId,        // $1
      qty,            // $2
      departmentId,   // $3
      assigned_to     // $4
    ]);

    res.status(201).json(jobRows[0]);
  } catch (err) {
    console.error('POST /api/jobs/push/:dealId error', err);
    res.status(500).json({ error: 'Failed to push to production' });
  }
});

module.exports = router;
