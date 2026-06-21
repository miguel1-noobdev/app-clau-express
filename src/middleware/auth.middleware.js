const { User } = require('../models');

function isAuthenticated(req, res, next) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ error: 'No autenticado' });
}

async function isAdmin(req, res, next) {
  try {
    const user = await User.findById(req.session.userId);
    if (user && (user.role === 'admin' || user.role === 'supervisor')) {
      return next();
    }
    return res.status(403).json({ error: 'Acceso denegado' });
  } catch {
    return res.status(500).json({ error: 'Error al verificar permisos' });
  }
}

module.exports = { isAuthenticated, isAdmin };
