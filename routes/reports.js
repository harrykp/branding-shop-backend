const router = require('express').Router();

// GET /api/reports
router.get('/', (req, res) => {
  res.json({ message: 'Implement report endpoints (e.g. /sales, /finance, /taxes, /leave, /cashflow)' });
});

module.exports = router;

