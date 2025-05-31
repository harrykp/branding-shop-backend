const db = require('../db');

// Enforce access based on roles (e.g., 'admin', 'manager')
function restrictToRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const isAllowed = userRoles.some(role => allowedRoles.includes(role));
    if (!isAllowed) return res.status(403).json({ message: "Access denied: insufficient permissions" });
    next();
  };
}

// Middleware flag to enable "owned only" filtering on routes
function filterByOwnership(field = 'user_id') {
  return (req, res, next) => {
    req.ownershipFilter = { field, userId: req.user?.id };
    next();
  };
}

// Helper: Build WHERE clause if ownershipFilter is active
function getOwnershipClause(req, existing = 'WHERE') {
  if (!req.ownershipFilter) return { clause: '', values: [] };
  const { field, userId } = req.ownershipFilter;
  return {
    clause: `${existing} ${field} = $1`,
    values: [userId]
  };
}

module.exports = {
  restrictToRoles,
  filterByOwnership,
  getOwnershipClause
};
