const { User, Record, AccessLog, ModificationLog } = require('../models');
const { randomBytes } = require('crypto');

async function listUsers(sessionUserId) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return { success: true, users };
  } catch {
    return { success: false, error: 'Error al obtener usuarios' };
  }
}

async function createUser(userData, sessionUsername) {
  try {
    const { username, password, role, phone, email } = userData;

    if ((role === 'admin' || role === 'supervisor') && sessionUsername !== 'admin') {
      return {
        success: false,
        error: 'Solo el administrador principal puede crear cuentas de administrador o supervisor',
      };
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return { success: false, error: 'El usuario ya existe' };
    }

    // Password is hashed automatically by User model pre-save hook
    const newUser = new User({
      username,
      password,
      role,
      phone: phone || '',
      email: email || '',
      mustChangePassword: true,
      createdBy: sessionUsername,
    });
    await newUser.save();

    return {
      success: true,
      user: {
        _id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        phone: newUser.phone,
        email: newUser.email,
        mustChangePassword: newUser.mustChangePassword,
      },
    };
  } catch {
    return { success: false, error: 'Error al crear usuario' };
  }
}

async function updateUser(userId, updateData, sessionUsername) {
  try {
    const { username, password, role } = updateData;
    const data = { username, role };

    if (password) {
      const user = await User.findById(userId);
      // Password is hashed automatically by User model pre-save hook
      user.password = password;
      await user.save();
    }

    const updatedUser = await User.findByIdAndUpdate(userId, data, { new: true }).select('-password');
    return { success: true, user: updatedUser };
  } catch {
    return { success: false, error: 'Error al actualizar usuario' };
  }
}

async function deleteUser(userId) {
  try {
    const targetUser = await User.findById(userId);
    if (targetUser && targetUser.username === 'admin') {
      return { success: false, error: 'No se puede eliminar la cuenta del administrador principal' };
    }
    await User.findByIdAndDelete(userId);
    return { success: true };
  } catch {
    return { success: false, error: 'Error al eliminar usuario' };
  }
}

async function toggleUserStatus(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    user.isActive = !user.isActive;
    await user.save();

    return {
      success: true,
      user: {
        username: user.username,
        isActive: user.isActive,
      },
    };
  } catch {
    return { success: false, error: 'Error al cambiar estado del usuario' };
  }
}

async function changeUserRole(userId, role, sessionUsername) {
  try {
    if ((role === 'admin' || role === 'supervisor') && sessionUsername !== 'admin') {
      return {
        success: false,
        error: 'Solo el administrador principal puede asignar roles de administrador o supervisor',
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    if (user.username === 'admin') {
      return { success: false, error: 'No se puede cambiar el rol del administrador principal' };
    }

    user.role = role;
    await user.save();

    return {
      success: true,
      user: {
        username: user.username,
        role: user.role,
      },
    };
  } catch {
    return { success: false, error: 'Error al cambiar rol del usuario' };
  }
}

async function resetUserPassword(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const tempPassword = randomBytes(12).toString('base64').slice(0, 16);
    // Password is hashed automatically by User model pre-save hook
    user.password = tempPassword;
    user.mustChangePassword = true;
    await user.save();

    return {
      success: true,
      temporaryPassword: tempPassword,
    };
  } catch {
    return { success: false, error: 'Error al resetear contraseña' };
  }
}

async function getUserRecords(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const records = await Record.find({ userId }).sort({ fecha: -1 });
    return { success: true, username: user.username, records };
  } catch {
    return { success: false, error: 'Error al obtener registros del usuario' };
  }
}

async function editRecord(recordId, editData, adminUsername) {
  try {
    const record = await Record.findById(recordId).populate('userId', 'username');
    if (!record) {
      return { success: false, error: 'Registro no encontrado' };
    }

    const originalData = {
      fecha: record.fecha,
      horaInicio: record.horaInicio,
      horaFin: record.horaFin,
      totalHoras: record.totalHoras,
      parador: record.parador,
      notas: record.notas,
    };

    const allowedFields = ['fecha', 'horaInicio', 'horaFin', 'totalHoras', 'horasNocturnas', 'parador', 'notas', 'reason'];
    const updateData = {};
    for (const field of allowedFields) {
      if (editData[field] !== undefined) {
        updateData[field] = editData[field];
      }
    }

    const updatedRecord = await Record.findByIdAndUpdate(recordId, updateData, {
      new: true,
      runValidators: true,
    }).populate('userId', 'username');

    const modLog = await ModificationLog.create({
      adminUsername,
      targetUsername: updatedRecord.userId.username,
      recordId: updatedRecord._id,
      action: 'edit',
      changes: {
        before: originalData,
        after: editData,
      },
      reason: editData.reason || '',
    });

    return { success: true, record: updatedRecord, logId: modLog._id };
  } catch {
    return { success: false, error: 'Error al editar registro' };
  }
}

async function deleteRecord(recordId, reason, adminUsername) {
  try {
    const record = await Record.findById(recordId).populate('userId', 'username');
    if (!record) {
      return { success: false, error: 'Registro no encontrado' };
    }

    const recordData = {
      fecha: record.fecha,
      horaInicio: record.horaInicio,
      horaFin: record.horaFin,
      totalHoras: record.totalHoras,
      parador: record.parador,
      notas: record.notas,
    };

    const modLog = await ModificationLog.create({
      adminUsername,
      targetUsername: record.userId.username,
      recordId: record._id,
      action: 'delete',
      changes: { deleted: recordData },
      reason: reason || '',
    });

    await Record.findByIdAndDelete(recordId);

    return { success: true, logId: modLog._id };
  } catch {
    return { success: false, error: 'Error al eliminar registro' };
  }
}

async function getAccessLogs(query) {
  try {
    const limit = Math.min(parseInt(query.limit) || 50, 200);
    const offset = parseInt(query.offset) || 0;

    const filter = {};
    if (query.username) {
      filter.username = String(query.username);
    }
    if (query.action) {
      filter.action = String(query.action);
    }

    const logs = await AccessLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset);

    const total = await AccessLog.countDocuments(filter);

    return { success: true, logs, total };
  } catch {
    return { success: false, error: 'Error al obtener logs de acceso', logs: [], total: 0 };
  }
}

async function getModificationLogs(query) {
  try {
    const limit = Math.min(parseInt(query.limit) || 50, 200);
    const offset = parseInt(query.offset) || 0;

    const filter = {};
    if (query.adminUsername) {
      filter.adminUsername = String(query.adminUsername);
    }
    if (query.action) {
      filter.action = String(query.action);
    }

    const logs = await ModificationLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset);

    const total = await ModificationLog.countDocuments(filter);

    return { success: true, logs, total };
  } catch {
    return { success: false, error: 'Error al obtener logs de modificaciones', logs: [], total: 0 };
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  changeUserRole,
  resetUserPassword,
  getUserRecords,
  editRecord,
  deleteRecord,
  getAccessLogs,
  getModificationLogs,
};
