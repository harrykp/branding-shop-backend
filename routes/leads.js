const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

// GET /api/leads?search=&page=&limit=
router.get("/", requireAuth, async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT l.*, i.name AS industry_name, r.name AS referral_source_name
      FROM leads l
      LEFT JOIN industries i ON l.industry_id = i.id
      LEFT JOIN referral_sources r ON l.referral_source_id = r.id
      WHERE LOWER(l.name) LIKE $1 OR LOWER(l.email) LIKE $1
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `SELECT COUNT(*) FROM leads WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1`;

    const [leadsResult, countResult] = await Promise.all([
      db.query(query, [`%${search.toLowerCase()}%`, limit, offset]),
      db.query(countQuery, [`%${search.toLowerCase()}%`])
    ]);

    const leads = leadsResult.rows;

    for (let lead of leads) {
      const interestRes = await db.query(
        `SELECT category_id FROM lead_interests WHERE lead_id = $1`,
        [lead.id]
      );
      lead.lead_interests = interestRes.rows.map(r => r.category_id);
    }

    res.json({ results: leads, total: parseInt(countResult.rows[0].count, 10) });
  } catch (err) {
    console.error("GET /api/leads error:", err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// GET /api/leads/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const leadRes = await db.query(
      `SELECT l.*, i.name AS industry_name, r.name AS referral_source_name
       FROM leads l
       LEFT JOIN industries i ON l.industry_id = i.id
       LEFT JOIN referral_sources r ON l.referral_source_id = r.id
       WHERE l.id = $1`,
      [req.params.id]
    );

    if (leadRes.rows.length === 0) return res.status(404).json({ error: "Lead not found" });

    const lead = leadRes.rows[0];
    const interests = await db.query(
      `SELECT category_id FROM lead_interests WHERE lead_id = $1`,
      [lead.id]
    );
    lead.lead_interests = interests.rows.map(r => r.category_id);

    res.json(lead);
  } catch (err) {
    console.error("GET /api/leads/:id error:", err);
    res.status(500).json({ error: "Failed to get lead" });
  }
});

// POST /api/leads
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name, email, phone, website_url, industry_id,
      referral_source_id, notes, status, priority,
      next_follow_up_at, last_contacted_at, lead_interests
    } = req.body;

    const result = await db.query(
      `INSERT INTO leads (name, email, phone, website_url, industry_id, referral_source_id, notes,
        status, priority, next_follow_up_at, last_contacted_at, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [
        name, email, phone, website_url, industry_id || null, referral_source_id || null,
        notes, status, priority, next_follow_up_at || null, last_contacted_at || null,
        req.user.userId
      ]
    );

    const leadId = result.rows[0].id;

    if (Array.isArray(lead_interests)) {
      for (const categoryId of lead_interests) {
        await db.query(
          `INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`,
          [leadId, categoryId]
        );
      }
    }

    res.status(201).json({ id: leadId });
  } catch (err) {
    console.error("POST /api/leads error:", err);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

// PUT /api/leads/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const {
      name, email, phone, website_url, industry_id,
      referral_source_id, notes, status, priority,
      next_follow_up_at, last_contacted_at, lead_interests
    } = req.body;

    await db.query(
      `UPDATE leads SET name=$1, email=$2, phone=$3, website_url=$4,
        industry_id=$5, referral_source_id=$6, notes=$7, status=$8, priority=$9,
        next_follow_up_at=$10, last_contacted_at=$11 WHERE id=$12`,
      [
        name, email, phone, website_url, industry_id || null, referral_source_id || null,
        notes, status, priority, next_follow_up_at || null, last_contacted_at || null, req.params.id
      ]
    );

    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [req.params.id]);

    if (Array.isArray(lead_interests)) {
      for (const categoryId of lead_interests) {
        await db.query(
          `INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`,
          [req.params.id, categoryId]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/leads/:id error:", err);
    res.status(500).json({ error: "Failed to update lead" });
  }
});

// DELETE /api/leads/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [req.params.id]);
    await db.query(`DELETE FROM leads WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/leads/:id error:", err);
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

module.exports = router;
