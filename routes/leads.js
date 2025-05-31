const express = require('express');
const router = express.Router();
const db = require('../db');
const { filterByOwnership, getOwnershipClause } = require('../middleware/userAccess');

// GET /api/leads - list leads (admins see all, others only their own)
router.get('/', filterByOwnership(), async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM leads';
    const { clause, values } = getOwnershipClause(req);
    const finalQuery = clause ? `${baseQuery} ${clause}` : baseQuery;
    const result = await db.query(finalQuery, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching leads:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/leads - create lead
router.post('/', async (req, res) => {
  const { name, contact_info, interest_level } = req.body;
  const userId = req.user.id;
  try {
    const result = await db.query(
      'INSERT INTO leads (user_id, name, contact_info, interest_level) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, contact_info, interest_level]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating lead:", err);
    res.status(500).json({ message: "Error creating lead" });
  }
});

// PUT /api/leads/:id - update lead
router.put('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { name, contact_info, interest_level } = req.body;
  const { clause, values } = getOwnershipClause(req, 'AND');

  try {
    const query = `UPDATE leads SET name = $1, contact_info = $2, interest_level = $3 WHERE id = $4 ${clause} RETURNING *`;
    const result = await db.query(query, [name, contact_info, interest_level, id, ...values]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Lead not found or unauthorized" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating lead:", err);
    res.status(500).json({ message: "Error updating lead" });
  }
});

// DELETE /api/leads/:id - delete lead
router.delete('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { clause, values } = getOwnershipClause(req, 'AND');

  try {
    const query = `DELETE FROM leads WHERE id = $1 ${clause}`;
    const result = await db.query(query, [id, ...values]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Lead not found or unauthorized" });
    }

    res.json({ message: "Lead deleted" });
  } catch (err) {
    console.error("Error deleting lead:", err);
    res.status(500).json({ message: "Error deleting lead" });
  }
});

module.exports = router;
