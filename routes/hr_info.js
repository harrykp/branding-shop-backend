const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET all hr_info (paginated + filtered)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const query = `%${search.toLowerCase()}%`;

    const totalRes = await db.query(`SELECT COUNT(*) FROM hr_info`);
    const total = parseInt(totalRes.rows[0].count);

    const result = await db.query(`
      SELECT h.*, u.name AS employee_name, d.name AS department_name
      FROM hr_info h
      LEFT JOIN users u ON h.user_id = u.id
      LEFT JOIN departments d ON h.department_id = d.id
      WHERE LOWER(COALESCE(u.name, '')) LIKE $1
      ORDER BY h.created_at DESC
      LIMIT $2 OFFSET $3
    `, [query, limit, offset]);

    res.json({ data: result.rows, total });
  } catch (err) {
    console.error('Error fetching HR info:', err);
    res.status(500).json({ message: 'Failed to fetch HR info' });
  }
});

// GET single hr_info by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM hr_info WHERE id = $1`, [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching HR record:', err);
    res.status(500).json({ message: 'Failed to fetch HR info' });
  }
});

// POST new hr_info
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      user_id, department_id, position, employment_type, start_date, end_date,
      ssnit_number, tin_number, nhis_number, salary, bank_account, notes,
      photo_url, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship
    } = req.body;

    await db.query(`
      INSERT INTO hr_info (
        user_id, department_id, position, employment_type,
        start_date, end_date, ssnit_number, tin_number, nhis_number,
        salary, bank_account, notes, created_by,
        photo_url, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17
      )
    `, [
      user_id, department_id, position, employment_type,
      start_date, end_date, ssnit_number, tin_number, nhis_number,
      salary, bank_account, notes, req.user.userId,
      photo_url, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship
    ]);

    res.status(201).json({ message: 'HR info created' });
  } catch (err) {
    console.error('Error creating HR record:', err);
    res.status(500).json({ message: 'Failed to create HR info' });
  }
});

// PUT update hr_info
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      user_id, department_id, position, employment_type, start_date, end_date,
      ssnit_number, tin_number, nhis_number, salary, bank_account, notes,
      photo_url, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship
    } = req.body;

    await db.query(`
      UPDATE hr_info SET
        user_id=$1, department_id=$2, position=$3, employment_type=$4,
        start_date=$5, end_date=$6, ssnit_number=$7, tin_number=$8, nhis_number=$9,
        salary=$10, bank_account=$11, notes=$12,
        photo_url=$13, next_of_kin_name=$14, next_of_kin_phone=$15, next_of_kin_relationship=$16
      WHERE id = $17
    `, [
      user_id, department_id, position, employment_type,
      start_date, end_date, ssnit_number, tin_number, nhis_number,
      salary, bank_account, notes,
      photo_url, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship,
      req.params.id
    ]);

    res.json({ message: 'HR info updated' });
  } catch (err) {
    console.error('Error updating HR info:', err);
    res.status(500).json({ message: 'Failed to update HR info' });
  }
});

// DELETE hr_info
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query(`DELETE FROM hr_info WHERE id = $1`, [req.params.id]);
    res.json({ message: 'HR info deleted' });
  } catch (err) {
    console.error('Error deleting HR info:', err);
    res.status(500).json({ message: 'Failed to delete HR info' });
  }
});

module.exports = router;
