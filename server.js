require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const User = require('./src/models/User');
const { AccessLog, ModificationLog } = require('./src/models/Logs');
const Message = require('./src/models/Message');
const Record = require('./src/models/Record');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy in production for secure cookies behind reverse proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// CORS — explicit origins only
const allowedOrigins = ['https://clau-app.duckdns.org', 'http://localhost:3001', 'http://127.0.0.1:3001'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(helmet()); // Security headers

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Demasiadas solicitudes, intenta de nuevo en 15 minutos' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: { error: 'Demasiados intentos de login, intenta de nuevo en 15 minutos' },
  skipSuccessfulRequests: true // don't count successful logins
});

app.use('/api/', generalLimiter);

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      errors: errors.array().map(err => err.msg)
    });
  }
  next();
};

// MongoDB URI (define before session/bootstrap to ensure availability)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/claudia';

// Session configuration should be registered before modular bootstrap so
// modular routes can rely on req.session
// Configurar store de sesión dependiendo de la API detectada
const sessionStore = MongoStore.create({ 
  mongoUrl: MONGODB_URI, 
  touchAfter: 24 * 3600 
});

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is required');
  process.exit(1);
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Monolith backend (modular scaffolding moved to docs/backend-scaffolding/)

// MongoDB Connection
// MONGODB_URI is defined earlier in this file to ensure it's available for session setup

// Session bootstrap will be defined once with a proper MONGODB_URI variable

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log(' Conectado a MongoDB');

    // Create admin user if it doesn't exist
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.error('FATAL: ADMIN_PASSWORD environment variable is required to bootstrap the admin user');
        process.exit(1);
      }
      const admin = new User({
        username: 'admin',
        password: adminPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Usuario admin creado: admin');
    }
  })
  .catch(err => console.error(' Error de conexión a MongoDB:', err));

// Record model moved to src/models/Record.js

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
};

// Middleware to check admin role (admin or supervisor)
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (user && (user.role === 'admin' || user.role === 'supervisor')) {
      next();
    } else {
      res.status(403).json({ error: 'Acceso denegado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar permisos' });
  }
};

// ===== AUTH ROUTES =====

// Login
app.post('/api/auth/login', 
  loginLimiter,
  body('username').trim().notEmpty().withMessage('El usuario es requerido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  validate,
  async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username: username.toLowerCase() });

    // Log failed login attempt
    if (!user) {
      await AccessLog.create({
        username: username.toLowerCase(),
        action: 'failed_login',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await AccessLog.create({
        username: user.username,
        action: 'failed_login',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Usuario bloqueado. Contacte al administrador.' });
    }

    // Update last login and login count
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    // Log successful login
    await AccessLog.create({
      username: user.username,
      action: 'login',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.role = user.role;

    // Check if password change is required
    if (user.mustChangePassword) {
      return res.json({
        success: true,
        requirePasswordChange: true,
        userId: user._id,
        username: user.username
      });
    }

    res.json({
      success: true,
      requirePasswordChange: false,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const username = req.session.username;

    // Log logout
    if (username) {
      await AccessLog.create({
        username: username,
        action: 'logout',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

// Get current user
app.get('/api/auth/me', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// Get current user (alias for frontend)
app.get('/api/me', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// Change password (for first-time login or user request)
app.post('/api/auth/change-password',
  body('userId')
    .notEmpty().withMessage('El ID de usuario es requerido')
    .isMongoId().withMessage('ID de usuario inválido'),
  body('currentPassword')
    .notEmpty().withMessage('La contraseña actual es requerida'),
  body('newPassword')
    .notEmpty().withMessage('La nueva contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe incluir al menos una mayúscula')
    .matches(/[0-9]/).withMessage('La contraseña debe incluir al menos un número'),
  validate,
  async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Update password
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    // Create session
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// Update user profile (contact info and avatar)
app.put('/api/profile',
  isAuthenticated,
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Email inválido'),
  body('phone')
    .optional()
    .isString().withMessage('Teléfono inválido')
    .isLength({ max: 20 }).withMessage('El teléfono no puede exceder 20 caracteres'),
  body('avatar')
    .optional()
    .isString().withMessage('Avatar inválido'),
  validate,
  async (req, res) => {
  try {
    const { phone, email, avatar } = req.body;

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Update fields if provided
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: {
        phone: user.phone,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// Change password (for logged-in users)
app.post('/api/change-password', isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Check for uppercase and number
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'La contraseña debe incluir al menos una mayúscula y un número' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// ===== USER MANAGEMENT ROUTES (Admin only) =====

// Get all users
app.get('/api/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Create user
app.post('/api/users', 
  isAuthenticated, 
  isAdmin,
  body('username')
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ min: 3, max: 30 }).withMessage('El usuario debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El usuario solo puede contener letras, números y guiones bajos'),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe incluir al menos una mayúscula')
    .matches(/[0-9]/).withMessage('La contraseña debe incluir al menos un número'),
  body('role')
    .notEmpty().withMessage('El rol es requerido')
    .isIn(['user', 'admin', 'supervisor']).withMessage('Rol inválido'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Email inválido'),
  body('phone')
    .optional({ checkFalsy: true })
    .isString().withMessage('Teléfono inválido'),
  validate,
  async (req, res) => {
  try {
    const { username, password, role, phone, email } = req.body;

    // Only the original 'admin' user can create admin or supervisor accounts
    if ((role === 'admin' || role === 'supervisor') && req.session.username !== 'admin') {
      return res.status(403).json({
        error: 'Solo el administrador principal puede crear cuentas de administrador o supervisor'
      });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const newUser = new User({
      username,
      password,
      role,
      phone: phone || '',
      email: email || '',
      mustChangePassword: true, // Force password change on first login
      createdBy: req.session.username
    });
    await newUser.save();

    res.status(201).json({
      success: true,
      user: {
        _id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        phone: newUser.phone,
        email: newUser.email,
        mustChangePassword: newUser.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(400).json({ error: 'Error al crear usuario' });
  }
});

// Update user
app.put('/api/users/:id',
  isAuthenticated,
  isAdmin,
  param('id').isMongoId().withMessage('ID de usuario inválido'),
  body('username')
    .optional()
    .trim()
    .notEmpty().withMessage('El usuario no puede estar vacío')
    .isLength({ min: 3, max: 30 }).withMessage('El usuario debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El usuario solo puede contener letras, números y guiones bajos'),
  body('role')
    .optional()
    .isIn(['user', 'admin', 'supervisor']).withMessage('Rol inválido'),
  body('password')
    .optional()
    .notEmpty().withMessage('La contraseña no puede estar vacía')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe incluir al menos una mayúscula')
    .matches(/[0-9]/).withMessage('La contraseña debe incluir al menos un número'),
  validate,
  async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const updateData = { username, role };

    if (password) {
      const user = await User.findById(req.params.id);
      user.password = password;
      await user.save();
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar usuario' });
  }
});

// Delete user
app.delete('/api/users/:id',
  isAuthenticated,
  isAdmin,
  param('id').isMongoId().withMessage('ID de usuario inválido'),
  validate,
  async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// Toggle user status (block/unblock)
app.put('/api/users/:id/toggle-status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      user: {
        username: user.username,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
});

// Change user role
app.put('/api/users/:id/role',
  isAuthenticated,
  isAdmin,
  param('id').isMongoId().withMessage('ID de usuario inválido'),
  body('role')
    .notEmpty().withMessage('El rol es requerido')
    .isIn(['user', 'admin', 'supervisor']).withMessage('Rol inválido'),
  validate,
  async (req, res) => {
  try {
    const { role } = req.body;

    // Only the original 'admin' user can assign admin or supervisor roles
    if ((role === 'admin' || role === 'supervisor') && req.session.username !== 'admin') {
      return res.status(403).json({
        error: 'Solo el administrador principal puede asignar roles de administrador o supervisor'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Error al cambiar rol del usuario' });
  }
});

// Reset user password
app.put('/api/users/:id/reset-password', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Generate secure random temporary password
    const { randomBytes } = require('crypto');
    const tempPassword = randomBytes(12).toString('base64').slice(0, 16);

    user.password = tempPassword;
    user.mustChangePassword = true;
    await user.save();

    res.json({
      success: true,
      temporaryPassword: tempPassword,
      message: 'Contraseña reseteada. El usuario debe cambiarla en el próximo login.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
});

// Get all records for a specific user (admin only)
app.get('/api/users/:id/records',
  isAuthenticated,
  isAdmin,
  param('id').isMongoId().withMessage('ID de usuario inválido'),
  validate,
  async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const records = await Record.find({ userId: req.params.id }).sort({ fecha: -1 });

    res.json({
      success: true,
      username: user.username,
      records: records
    });
  } catch (error) {
    console.error('Get user records error:', error);
    res.status(500).json({ error: 'Error al obtener registros del usuario' });
  }
});

// Get access logs
app.get('/api/logs/access', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const query = {};
    if (req.query.username) {
      query.username = String(req.query.username);
    }
    if (req.query.action) {
      query.action = String(req.query.action);
    }

    const logs = await AccessLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset);

    const total = await AccessLog.countDocuments(query);

    res.json({
      success: true,
      logs: logs,
      total: total
    });
  } catch (error) {
    console.error('Get access logs error:', error);
    res.status(500).json({ error: 'Error al obtener logs de acceso' });
  }
});

// Get modification logs
app.get('/api/logs/modifications', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const query = {};
    if (req.query.adminUsername) {
      query.adminUsername = String(req.query.adminUsername);
    }
    if (req.query.action) {
      query.action = String(req.query.action);
    }

    const logs = await ModificationLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset);

    const total = await ModificationLog.countDocuments(query);

    res.json({
      success: true,
      logs: logs,
      total: total
    });
  } catch (error) {
    console.error('Get modification logs error:', error);
    res.status(500).json({ error: 'Error al obtener logs de modificaciones' });
  }
});

// ===== MESSAGE ROUTES =====

// Get all conversations for current user
app.get('/api/messages/conversations', isAuthenticated, async (req, res) => {
  try {
    const currentUsername = req.session.username;

    // Find all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [
        { from: currentUsername },
        { to: currentUsername }
      ]
    }).sort({ timestamp: -1 });

    // Build conversations map
    const conversationsMap = new Map();

    for (const msg of messages) {
      const otherUser = msg.from === currentUsername ? msg.to : msg.from;

      if (!conversationsMap.has(otherUser)) {
        // Count unread messages from this user
        const unreadCount = await Message.countDocuments({
          from: otherUser,
          to: currentUsername,
          isRead: false
        });

        conversationsMap.set(otherUser, {
          username: otherUser,
          lastMessage: msg.message.substring(0, 50) + (msg.message.length > 50 ? '...' : ''),
          lastMessageTime: msg.timestamp,
          unreadCount: unreadCount
        });
      }
    }

    // Convert map to array and sort by last message time
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    res.json({
      success: true,
      conversations: conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
});

// Get messages with a specific user
app.get('/api/messages/:username', isAuthenticated, async (req, res) => {
  try {
    const currentUsername = req.session.username;
    const otherUsername = req.params.username.toLowerCase();

    // Find all messages between these two users
    const messages = await Message.find({
      $or: [
        { from: currentUsername, to: otherUsername },
        { from: otherUsername, to: currentUsername }
      ]
    }).sort({ timestamp: 1 });

    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// Send a new message
app.post('/api/messages',
  isAuthenticated,
  body('to')
    .trim()
    .notEmpty().withMessage('El destinatario es requerido'),
  body('message')
    .trim()
    .notEmpty().withMessage('El mensaje es requerido')
    .isLength({ max: 1000 }).withMessage('El mensaje no puede exceder 1000 caracteres'),
  validate,
  async (req, res) => {
  try {
    const { to, message } = req.body;
    const from = req.session.username;

    // Validate recipient exists
    const recipient = await User.findOne({ username: to.toLowerCase() });
    if (!recipient) {
      return res.status(404).json({ error: 'Usuario destinatario no encontrado' });
    }

    // Create new message
    const newMessage = new Message({
      from: from,
      to: to.toLowerCase(),
      message: message.trim()
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// Mark messages as read
app.put('/api/messages/:username/mark-read', isAuthenticated, async (req, res) => {
  try {
    const currentUsername = req.session.username;
    const otherUsername = req.params.username.toLowerCase();

    // Mark all messages from otherUsername to currentUsername as read
    await Message.updateMany(
      {
        from: otherUsername,
        to: currentUsername,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );

    res.json({
      success: true,
      message: 'Mensajes marcados como leídos'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
  }
});

// Get unread message count
app.get('/api/messages/unread/count', isAuthenticated, async (req, res) => {
  try {
    const currentUsername = req.session.username;

    const count = await Message.countDocuments({
      to: currentUsername,
      isRead: false
    });

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Error al obtener contador de mensajes no leídos' });
  }
});

// Get messages with admin (for regular users)
app.get('/api/messages/admin', isAuthenticated, async (req, res) => {
  try {
    const currentUsername = req.session.username;

    // Find all messages between current user and admin
    const messages = await Message.find({
      $or: [
        { from: currentUsername, to: 'admin' },
        { from: 'admin', to: currentUsername }
      ]
    }).sort({ timestamp: 1 });

    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Get admin messages error:', error);
    res.status(500).json({ error: 'Error al obtener mensajes con admin' });
  }
});

// Mark messages from admin as read
app.put('/api/messages/admin/mark-read', isAuthenticated, async (req, res) => {
  try {
    const currentUsername = req.session.username;

    // Mark all messages from admin to current user as read
    await Message.updateMany(
      {
        from: 'admin',
        to: currentUsername,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );

    res.json({
      success: true,
      message: 'Mensajes marcados como leídos'
    });
  } catch (error) {
    console.error('Mark admin messages as read error:', error);
    res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
  }
});

// ===== RECORD ROUTES =====

// GET all records (only user's records)
app.get('/api/records', isAuthenticated, async (req, res) => {
  try {
    const records = await Record.find({ userId: req.session.userId })
      .sort({ fecha: -1, createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener registros' });
  }
});

// POST new record
app.post('/api/records', 
  isAuthenticated,
  body('fecha')
    .notEmpty().withMessage('La fecha es requerida')
    .isISO8601().withMessage('Fecha inválida'),
  body('horaInicio')
    .notEmpty().withMessage('La hora de inicio es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida (formato HH:MM)'),
  body('horaFin')
    .notEmpty().withMessage('La hora de fin es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida (formato HH:MM)'),
  body('parador')
    .trim()
    .notEmpty().withMessage('El parador es requerido')
    .isLength({ max: 100 }).withMessage('El parador no puede exceder 100 caracteres'),
  body('notas')
    .optional()
    .isString().withMessage('Las notas deben ser texto')
    .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  validate,
  async (req, res) => {
  try {
    const newRecord = new Record({
      ...req.body,
      userId: req.session.userId
    });
    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear registro' });
  }
});

// PUT update record
app.put('/api/records/:id',
  isAuthenticated,
  param('id').isMongoId().withMessage('ID de registro inválido'),
  body('fecha')
    .optional()
    .isISO8601().withMessage('Fecha inválida'),
  body('horaInicio')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida (formato HH:MM)'),
  body('horaFin')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida (formato HH:MM)'),
  body('parador')
    .optional()
    .trim()
    .notEmpty().withMessage('El parador no puede estar vacío')
    .isLength({ max: 100 }).withMessage('El parador no puede exceder 100 caracteres'),
  body('notas')
    .optional()
    .isString().withMessage('Las notas deben ser texto')
    .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  validate,
  async (req, res) => {
  try {
    const record = await Record.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!record) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    // Only allow safe fields — never permit userId or _id overwrite
    const allowedFields = ['fecha', 'horaInicio', 'horaFin', 'totalHoras', 'horasNocturnas', 'parador', 'notas'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updatedRecord = await Record.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedRecord);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar registro' });
  }
});

// DELETE record
app.delete('/api/records/:id',
  isAuthenticated,
  param('id').isMongoId().withMessage('ID de registro inválido'),
  validate,
  async (req, res) => {
  try {
    const record = await Record.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!record) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    await Record.findByIdAndDelete(req.params.id);
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});

// ===== ADMIN RECORD MANAGEMENT =====

// Admin: Edit any user's record
app.put('/api/records/:id/admin-edit',
  isAuthenticated,
  isAdmin,
  param('id').isMongoId().withMessage('ID de registro inválido'),
  body('fecha')
    .optional()
    .isISO8601().withMessage('Fecha inválida'),
  body('horaInicio')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida (formato HH:MM)'),
  body('horaFin')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida (formato HH:MM)'),
  body('parador')
    .optional()
    .trim()
    .notEmpty().withMessage('El parador no puede estar vacío')
    .isLength({ max: 100 }).withMessage('El parador no puede exceder 100 caracteres'),
  body('notas')
    .optional()
    .isString().withMessage('Las notas deben ser texto')
    .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  body('reason')
    .optional()
    .isString().withMessage('La razón debe ser texto')
    .isLength({ max: 200 }).withMessage('La razón no puede exceder 200 caracteres'),
  validate,
  async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('userId', 'username');

    if (!record) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    // Store original data for logging
    const originalData = {
      fecha: record.fecha,
      horaInicio: record.horaInicio,
      horaFin: record.horaFin,
      totalHoras: record.totalHoras,
      parador: record.parador,
      notas: record.notas
    };

    // Only allow safe fields — never permit userId or _id overwrite
    const allowedFields = ['fecha', 'horaInicio', 'horaFin', 'totalHoras', 'horasNocturnas', 'parador', 'notas', 'reason'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updatedRecord = await Record.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'username');

    // Log the modification
    const modLog = await ModificationLog.create({
      adminUsername: req.session.username,
      targetUsername: updatedRecord.userId.username,
      recordId: updatedRecord._id,
      action: 'edit',
      changes: {
        before: originalData,
        after: req.body
      },
      reason: req.body.reason || ''
    });

    res.json({
      success: true,
      record: updatedRecord,
      logId: modLog._id
    });
  } catch (error) {
    console.error('Admin edit record error:', error);
    res.status(500).json({ error: 'Error al editar registro' });
  }
});

// Admin: Delete any user's record
app.delete('/api/records/:id/admin-delete',
  isAuthenticated,
  isAdmin,
  param('id').isMongoId().withMessage('ID de registro inválido'),
  validate,
  async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('userId', 'username');

    if (!record) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    // Store record data for logging
    const recordData = {
      fecha: record.fecha,
      horaInicio: record.horaInicio,
      horaFin: record.horaFin,
      totalHoras: record.totalHoras,
      parador: record.parador,
      notas: record.notas
    };

    // Log the deletion
    const modLog = await ModificationLog.create({
      adminUsername: req.session.username,
      targetUsername: record.userId.username,
      recordId: record._id,
      action: 'delete',
      changes: {
        deleted: recordData
      },
      reason: req.body.reason || ''
    });

    // Delete the record
    await Record.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Registro eliminado correctamente',
      logId: modLog._id
    });
  } catch (error) {
    console.error('Admin delete record error:', error);
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  });
}

// Start server
const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
app.listen(PORT, host, () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIp = 'localhost';

  // Find primary IPv4 interface
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
  }

  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📱 Acceso desde red local: http://${localIp}:${PORT}`);
});

