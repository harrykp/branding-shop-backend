// ✅ FINAL: routes/leads.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all leads with pagination & search
router.get('/', async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const baseQuery = `
      SELECT leads.*, industries.name AS industry_name, referral_sources.name AS referral_source_name
      FROM leads
      LEFT JOIN industries ON leads.industry_id = industries.id
      LEFT JOIN referral_sources ON leads.referral_source_id = referral_sources.id
      WHERE leads.name ILIKE $1 OR leads.email ILIKE $1
      ORDER BY leads.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `SELECT COUNT(*) FROM leads WHERE name ILIKE $1 OR email ILIKE $1`;

    const [dataResult, countResult] = await Promise.all([
      db.query(baseQuery, [`%${search}%`, limit, offset]),
      db.query(countQuery, [`%${search}%`])
    ]);

    const leadIds = dataResult.rows.map(row => row.id);
    const interests = await db.query(
      `SELECT li.lead_id, pc.id, pc.name FROM lead_interests li
       JOIN product_categories pc ON li.category_id = pc.id
       WHERE li.lead_id = ANY($1)`, [leadIds]
    );

    const interestMap = {};
    interests.rows.forEach(({ lead_id, id, name }) => {
      if (!interestMap[lead_id]) interestMap[lead_id] = [];
      interestMap[lead_id].push({ id, name });
    });

    const leads = dataResult.rows.map(lead => ({
      ...lead,
      interested_in: interestMap[lead.id] || []
    }));

    res.json({ data: leads, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET single lead with full names
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const leadRes = await db.query(
      `SELECT leads.*, industries.name AS industry_name, referral_sources.name AS referral_source_name
       FROM leads
       LEFT JOIN industries ON leads.industry_id = industries.id
       LEFT JOIN referral_sources ON leads.referral_source_id = referral_sources.id
       WHERE leads.id = $1`, [id]);

    if (!leadRes.rows.length) return res.status(404).json({ error: 'Lead not found' });

    const interests = await db.query(
      `SELECT pc.id, pc.name FROM lead_interests li
       JOIN product_categories pc ON li.category_id = pc.id
       WHERE li.lead_id = $1`, [id]);

    res.json({
      ...leadRes.rows[0],
      lead_interests: interests.rows
    });
  } catch (err) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST create lead
router.post('/', async (req, res) => {
  const {
    name, email, phone, company, position, website_url,
    status, notes, priority, last_contacted_at, next_follow_up_at,
    sales_rep_id, customer_id, industry_id, referral_source_id, lead_interests = [], user_id
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO leads (name, email, phone, company, position, website_url,
        status, notes, priority, last_contacted_at, next_follow_up_at,
        sales_rep_id, customer_id, industry_id, referral_source_id, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING id`,
      [name, email, phone, company, position, website_url,
       status, notes, priority, last_contacted_at, next_follow_up_at,
       sales_rep_id, customer_id, industry_id, referral_source_id, user_id]
    );

    const leadId = result.rows[0].id;
    for (const catId of lead_interests) {
      await db.query(`INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`, [leadId, catId]);
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT update lead
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const {
    name, email, phone, company, position, website_url,
    status, notes, priority, last_contacted_at, next_follow_up_at,
    sales_rep_id, customer_id, industry_id, referral_source_id, lead_interests = [], user_id
  } = req.body;

  try {
    await db.query(
      `UPDATE leads SET name=$1, email=$2, phone=$3, company=$4, position=$5, website_url=$6,
        status=$7, notes=$8, priority=$9, last_contacted_at=$10, next_follow_up_at=$11,
        sales_rep_id=$12, customer_id=$13, industry_id=$14, referral_source_id=$15, user_id=$16
       WHERE id = $17`,
      [name, email, phone, company, position, website_url,
       status, notes, priority, last_contacted_at, next_follow_up_at,
       sales_rep_id, customer_id, industry_id, referral_source_id, user_id, id]
    );

    await db.query('DELETE FROM lead_interests WHERE lead_id = $1', [id]);
    for (const catId of lead_interests) {
      await db.query(`INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`, [id, catId]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE lead
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM lead_interests WHERE lead_id = $1', [req.params.id]);
    await db.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;
