'use strict';

/**
 * Restrict route access to one or more application roles.
 * Usage: requireRoles('FARM', 'STORE_ADMIN')
 */
function requireRoles(...roles) {
  const allowed = roles.flat();

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Role ${req.user.role} is not permitted for this operation`,
        code: 'FORBIDDEN',
        allowedRoles: allowed,
      });
    }

    return next();
  };
}

module.exports = { requireRoles };
