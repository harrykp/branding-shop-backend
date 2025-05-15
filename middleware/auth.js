const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware: Authenticate user and attach roles to req.user
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') && header.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.userId;

    const { rows } = await db.query(
      `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );
    const roles = rows.map(r => r.name);

    req.user = { id: userId, roles };
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware: Require admin role
function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user || !user.roles || !user.roles.includes('admin')) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin
};
