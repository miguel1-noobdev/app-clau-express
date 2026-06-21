const { User } = require('../models');

async function protectAdminAccount(req, res, next) {
  try {
    const targetUser = await User.findById(req.params.id);
    if (targetUser?.username === 'admin' && req.session?.username !== 'admin') {
      return res.status(403).json({ error: 'No se puede modificar la cuenta del administrador principal' });
    }
    return next();
  } catch {
    return res.status(500).json({ error: 'Error al verificar protección de cuenta' });
  }
}

module.exports = { protectAdminAccount };
