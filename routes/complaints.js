const express = require('express');
const router = express.Router();
const db = require('../db');
const { filterByOwnership, getOwnershipClause } = require('../middleware/userAccess');

// GET /api/complaints
router.get('/', filterByOwnership(), async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM complaints';
    const { clause, values } = getOwnershipClause(req);
    const finalQuery = clause ? \`\${baseQuery} \${clause}\` : baseQuery;
    const result = await db.query(finalQuery, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching complaints:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/complaints
router.post('/', async (req, res) => {
  const { order_id, content } = req.body;
  const userId = req.user.id;
  try {
    const result = await db.query(
      'INSERT INTO complaints (user_id, order_id, content) VALUES ($1, $2, $3) RETURNING *',
      [userId, order_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error submitting complaint:", err);
    res.status(500).json({ message: "Failed to submit complaint" });
  }
});

// DELETE /api/complaints/:id
router.delete('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { clause, values } = getOwnershipClause(req, 'AND');
  try {
    const result = await db.query(\`DELETE FROM complaints WHERE id = $1 \${clause}\`, [id, ...values]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Complaint not found or unauthorized" });
    res.json({ message: "Complaint deleted" });
  } catch (err) {
    console.error("Error deleting complaint:", err);
    res.status(500).json({ message: "Error deleting complaint" });
  }
});

module.exports = router;
