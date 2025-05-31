const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// GET /api/reports
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  res.json({ message: "Reports module loaded. Use subpaths for details." });
});

module.exports = router;
