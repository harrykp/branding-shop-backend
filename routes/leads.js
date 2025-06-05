const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET all leads with pagination and optional search
router.get('/', requireAuth, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const totalRes = await db.query(`SELECT COUNT(*) FROM leads WHERE name ILIKE $1`, [`%${search}%`]);
    const total = parseInt(totalRes.rows[0].count);

    const leadsRes = await db.query(`
      SELECT leads.*, industries.name AS industry_name, referral_sources.name AS referral_source_name
      FROM leads
      LEFT JOIN industries ON leads.industry_id = industries.id
      LEFT JOIN referral_sources ON leads.referral_source_id = referral_sources.id
      WHERE leads.name ILIKE $1
      ORDER BY leads.created_at DESC
      LIMIT $2 OFFSET $3
    `, [`%${search}%`, limit, offset]);

    for (const lead of leadsRes.rows) {
      const interests = await db.query(
        `SELECT product_category_id FROM lead_interests WHERE lead_id = $1`,
        [lead.id]
      );
      lead.lead_interests = interests.rows.map(r => r.product_category_id);
    }

    res.json({ results: leadsRes.rows, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET lead by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const leadRes = await db.query(`
      SELECT leads.*, industries.name AS industry_name, referral_sources.name AS referral_source_name
      FROM leads
      LEFT JOIN industries ON leads.industry_id = industries.id
      LEFT JOIN referral_sources ON leads.referral_source_id = referral_sources.id
      WHERE leads.id = $1
    `, [req.params.id]);

    const lead = leadRes.rows[0];
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const interests = await db.query(
      `SELECT product_category_id FROM lead_interests WHERE lead_id = $1`,
      [lead.id]
    );
    lead.lead_interests = interests.rows.map(r => r.product_category_id);

    res.json(lead);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// CREATE new lead
router.post('/', requireAuth, async (req, res) => {
  const {
    name, email, phone, website_url, industry_id,
    referral_source_id, lead_interests, notes,
    status, priority, last_contacted_at, next_follow_up_at
  } = req.body;

  const userId = req.user.userId;

  try {
    const result = await db.query(`
      INSERT INTO leads (name, email, phone, website_url, industry_id, referral_source_id, notes, status, priority, last_contacted_at, next_follow_up_at, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id
    `, [name, email, phone, website_url, industry_id, referral_source_id, notes, status, priority, last_contacted_at, next_follow_up_at, userId]);

    const leadId = result.rows[0].id;

    if (lead_interests?.length) {
      for (const catId of lead_interests) {
        await db.query(
          `INSERT INTO lead_interests (lead_id, product_category_id) VALUES ($1, $2)`,
          [leadId, catId]
        );
      }
    }

    res.json({ id: leadId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// UPDATE lead
router.put('/:id', requireAuth, async (req, res) => {
  const {
    name, email, phone, website_url, industry_id,
    referral_source_id, lead_interests, notes,
    status, priority, last_contacted_at, next_follow_up_at
  } = req.body;

  try {
    await db.query(`
      UPDATE leads SET name=$1, email=$2, phone=$3, website_url=$4,
      industry_id=$5, referral_source_id=$6, notes=$7, status=$8,
      priority=$9, last_contacted_at=$10, next_follow_up_at=$11
      WHERE id=$12
    `, [name, email, phone, website_url, industry_id, referral_source_id, notes, status, priority, last_contacted_at, next_follow_up_at, req.params.id]);

    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [req.params.id]);

    if (lead_interests?.length) {
      for (const catId of lead_interests) {
        await db.query(
          `INSERT INTO lead_interests (lead_id, product_category_id) VALUES ($1, $2)`,
          [req.params.id, catId]
        );
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE lead
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [req.params.id]);
    await db.query(`DELETE FROM leads WHERE id = $1`, [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;
