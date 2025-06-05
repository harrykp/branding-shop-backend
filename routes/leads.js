// ✅ FILE: routes/leads.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const baseQuery = `
      SELECT leads.*, industries.name AS industry_name, referral_sources.name AS referral_source_name
      FROM leads
      LEFT JOIN industries ON leads.industry_id = industries.id
      LEFT JOIN referral_sources ON leads.referral_source_id = referral_sources.id
      WHERE leads.name ILIKE $1 OR leads.email ILIKE $1
      ORDER BY leads.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM leads
      WHERE name ILIKE $1 OR email ILIKE $1
    `;

    const [leadsResult, countResult] = await Promise.all([
      db.query(baseQuery, [`%${search}%`, limit, offset]),
      db.query(countQuery, [`%${search}%`])
    ]);

    // Fetch all categories linked to leads
    const leadIds = leadsResult.rows.map(row => row.id);
    const interestQuery = `
      SELECT li.lead_id, pc.id AS category_id, pc.name AS category_name
      FROM lead_interests li
      JOIN product_categories pc ON li.category_id = pc.id
      WHERE li.lead_id = ANY($1)
    `;

    const interestResult = await db.query(interestQuery, [leadIds]);
    const interestMap = {};
    interestResult.rows.forEach(({ lead_id, category_id, category_name }) => {
      if (!interestMap[lead_id]) interestMap[lead_id] = [];
      interestMap[lead_id].push({ id: category_id, name: category_name });
    });

    const leads = leadsResult.rows.map(lead => ({
      ...lead,
      interested_in: interestMap[lead.id] || []
    }));

    res.json({ data: leads, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

module.exports = router;
