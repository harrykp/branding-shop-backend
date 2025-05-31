const express = require('express');
const router = express.Router();
const db = require('../db');
const { filterByOwnership, getOwnershipClause } = require('../middleware/userAccess');

// GET /api/deals - list deals
router.get('/', filterByOwnership(), async (req, res) => {
  try {
    const baseQuery = 'SELECT * FROM deals';
    const { clause, values } = getOwnershipClause(req);
    const finalQuery = clause ? \`\${baseQuery} \${clause}\` : baseQuery;
    const result = await db.query(finalQuery, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching deals:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/deals - create deal
router.post('/', async (req, res) => {
  const { name, value, status } = req.body;
  const userId = req.user.id;
  try {
    const result = await db.query(
      'INSERT INTO deals (user_id, name, value, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, value, status || 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating deal:", err);
    res.status(500).json({ message: "Error creating deal" });
  }
});

// PUT /api/deals/:id
router.put('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { name, value, status } = req.body;
  const { clause, values } = getOwnershipClause(req, 'AND');
  try {
    const result = await db.query(
      \`UPDATE deals SET name = $1, value = $2, status = $3 WHERE id = $4 \${clause} RETURNING *\`,
      [name, value, status, id, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Deal not found or unauthorized" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating deal:", err);
    res.status(500).json({ message: "Error updating deal" });
  }
});

// DELETE /api/deals/:id
router.delete('/:id', filterByOwnership(), async (req, res) => {
  const { id } = req.params;
  const { clause, values } = getOwnershipClause(req, 'AND');
  try {
    const result = await db.query(\`DELETE FROM deals WHERE id = $1 \${clause}\`, [id, ...values]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Deal not found or unauthorized" });
    res.json({ message: "Deal deleted" });
  } catch (err) {
    console.error("Error deleting deal:", err);
    res.status(500).json({ message: "Error deleting deal" });
  }
});

module.exports = router;
