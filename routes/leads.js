// routes/leads.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/leads
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT l.*, u.name AS user_name, i.name AS industry, r.name AS referral_source
       FROM leads l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN industries i ON l.industry_id = i.id
       LEFT JOIN referral_sources r ON l.referral_source_id = r.id
       ORDER BY l.created_at DESC`
    );

    const leads = result.rows;
    for (let lead of leads) {
      const interestsRes = await db.query(
        `SELECT category_id FROM lead_interests WHERE lead_id = $1`,
        [lead.id]
      );
      lead.interests = interestsRes.rows.map(row => row.category_id);
    }

    res.json({ data: leads });
  } catch (err) {
    console.error("Error fetching leads:", err);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
});

// POST /api/leads
router.post('/', authenticate, async (req, res) => {
  const {
    name, company, position, email, phone, website_url,
    status, priority, industry_id, referral_source_id,
    last_contacted_at, next_follow_up_at, interests
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO leads
       (name, company, position, email, phone, website_url, status, priority,
        industry_id, referral_source_id, last_contacted_at, next_follow_up_at, user_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW()) RETURNING id`,
      [name, company, position, email, phone, website_url, status, priority,
       industry_id, referral_source_id, last_contacted_at, next_follow_up_at, req.user.userId]
    );
    const leadId = result.rows[0].id;

    if (Array.isArray(interests)) {
      for (let categoryId of interests) {
        await db.query(
          `INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`,
          [leadId, categoryId]
        );
      }
    }

    res.status(201).json({ message: 'Lead created' });
  } catch (err) {
    console.error("Error creating lead:", err);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  const {
    name, company, position, email, phone, website_url,
    status, priority, industry_id, referral_source_id,
    last_contacted_at, next_follow_up_at, interests
  } = req.body;

  try {
    await db.query(
      `UPDATE leads SET
        name=$1, company=$2, position=$3, email=$4, phone=$5, website_url=$6,
        status=$7, priority=$8, industry_id=$9, referral_source_id=$10,
        last_contacted_at=$11, next_follow_up_at=$12
       WHERE id = $13`,
      [name, company, position, email, phone, website_url,
       status, priority, industry_id, referral_source_id,
       last_contacted_at, next_follow_up_at, id]
    );

    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [id]);
    if (Array.isArray(interests)) {
      for (let categoryId of interests) {
        await db.query(
          `INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`,
          [id, categoryId]
        );
      }
    }

    res.json({ message: 'Lead updated' });
  } catch (err) {
    console.error("Error updating lead:", err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  try {
    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [id]);
    await db.query(`DELETE FROM leads WHERE id = $1`, [id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error("Error deleting lead:", err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

module.exports = router;
