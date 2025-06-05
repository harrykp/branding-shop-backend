// routes/leads.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/leads with pagination and filtering
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    const leadsQuery = `
      SELECT l.*, i.name AS industry_name, r.name AS referral_source_name,
        ARRAY(
          SELECT pc.name FROM lead_interests li
          JOIN product_categories pc ON li.category_id = pc.id
          WHERE li.lead_id = l.id
        ) AS interests
      FROM leads l
      LEFT JOIN industries i ON l.industry_id = i.id
      LEFT JOIN referral_sources r ON l.referral_source_id = r.id
      WHERE l.name ILIKE $1 OR l.email ILIKE $1
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3`;

    const countQuery = `
      SELECT COUNT(*) FROM leads l
      WHERE l.name ILIKE $1 OR l.email ILIKE $1`;

    const leadsResult = await db.query(leadsQuery, [`%${search}%`, limit, offset]);
    const countResult = await db.query(countQuery, [`%${search}%`]);
    const total = parseInt(countResult.rows[0].count);

    res.json({ data: leadsResult.rows, total });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
});

// GET single lead with full details
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  try {
    const leadRes = await db.query(`
      SELECT l.*, i.name AS industry_name, r.name AS referral_source_name
      FROM leads l
      LEFT JOIN industries i ON l.industry_id = i.id
      LEFT JOIN referral_sources r ON l.referral_source_id = r.id
      WHERE l.id = $1`, [id]);

    const interestsRes = await db.query(`
      SELECT category_id FROM lead_interests WHERE lead_id = $1`, [id]);

    const lead = leadRes.rows[0];
    lead.interests = interestsRes.rows.map(row => row.category_id);

    res.json(lead);
  } catch (err) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ message: 'Failed to fetch lead' });
  }
});

// POST new lead
router.post('/', authenticate, async (req, res) => {
  const {
    name, email, phone, company, position, website_url, priority, status,
    last_contacted_at, next_follow_up_at, industry_id, referral_source_id, interests
  } = req.body;

  try {
    const leadResult = await db.query(`
      INSERT INTO leads (name, email, phone, company, position, website_url, priority, status,
        last_contacted_at, next_follow_up_at, industry_id, referral_source_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [name, email, phone, company, position, website_url, priority, status,
       last_contacted_at, next_follow_up_at, industry_id, referral_source_id]);

    const leadId = leadResult.rows[0].id;

    if (Array.isArray(interests)) {
      for (const catId of interests) {
        await db.query(`INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`, [leadId, catId]);
      }
    }

    res.status(201).json({ message: 'Lead created' });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

// PUT update lead
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  const {
    name, email, phone, company, position, website_url, priority, status,
    last_contacted_at, next_follow_up_at, industry_id, referral_source_id, interests
  } = req.body;

  try {
    await db.query(`
      UPDATE leads SET
        name=$1, email=$2, phone=$3, company=$4, position=$5, website_url=$6,
        priority=$7, status=$8, last_contacted_at=$9, next_follow_up_at=$10,
        industry_id=$11, referral_source_id=$12
      WHERE id = $13`,
      [name, email, phone, company, position, website_url, priority, status,
       last_contacted_at, next_follow_up_at, industry_id, referral_source_id, id]);

    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [id]);
    if (Array.isArray(interests)) {
      for (const catId of interests) {
        await db.query(`INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`, [id, catId]);
      }
    }

    res.json({ message: 'Lead updated' });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

// DELETE lead
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM lead_interests WHERE lead_id = $1', [id]);
    await db.query('DELETE FROM leads WHERE id = $1', [id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

module.exports = router;
