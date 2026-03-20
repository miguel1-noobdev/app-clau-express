// Modular routes for CLAUDIA Express
const express = require('express')
const router = express.Router()

// Try to import root models for login endpoint (optional at bootstrap stage)
let User
try {
  User = require('../models').User
} catch (e) {
  User = null
}

// Health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', modular: true, timestamp: new Date().toISOString() })
})

// Demo endpoint for end-to-end bootstrap
router.get('/demo', (req, res) => {
  res.json({ status: 'demo', timestamp: new Date().toISOString(), note: 'Modular bootstrap endpoint' })
})

// Auth endpoints (login/me) - only if User model is available
if (User) {
  // Login
  router.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body
      const user = await User.findOne({ username: username.toLowerCase() })
      if (!user) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
      }
      const ok = await user.comparePassword(password)
      if (!ok) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
      }
      if (!user.isActive) {
        return res.status(403).json({ error: 'Usuario bloqueado. Contacte al administrador.' })
      }
      user.lastLogin = new Date()
      user.loginCount = (user.loginCount || 0) + 1
      await user.save()
      // Setup session
      if (req && req.session) {
        req.session.userId = user._id
        req.session.username = user.username
        req.session.role = user.role
      }
      if (user.mustChangePassword) {
        return res.json({ success: true, requirePasswordChange: true, userId: user._id, username: user.username })
      }
      res.json({ success: true, requirePasswordChange: false, user: { id: user._id, username: user.username, role: user.role } })
    } catch (err) {
      console.error('Modular login error:', err)
      res.status(500).json({ error: 'Error al iniciar sesión' })
    }
  })

  // Get current user
  router.get('/auth/me', (req, res) => {
    if (req.session && req.session.userId) {
      User.findById(req.session.userId).select('-password')
        .then(u => res.json(u))
        .catch(() => res.status(500).json({ error: 'Error al obtener usuario' }))
    } else {
      res.status(401).json({ error: 'No autenticado' })
    }
  })
}

// Admin-only endpoints for user management (Phase 1 advanced endpoints)
const adminOnly = (req, res, next) => {
  if (req.session && req.session.username === 'admin') return next()
  return res.status(403).json({ error: 'Acceso denegado' })
}

if (User) {
  // GET /api/users
  router.get('/users', adminOnly, async (req, res) => {
    try {
      const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(200)
      res.json(users)
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener usuarios' })
    }
  })

  // POST /api/users
  router.post('/users', adminOnly, async (req, res) => {
    try {
      const { username, password, role, phone, email } = req.body
      if (!username || !password) return res.status(400).json({ error: 'Faltan campos requeridos' })
      const existing = await User.findOne({ username: username.toLowerCase() })
      if (existing) return res.status(400).json({ error: 'Usuario ya existe' })
      const user = new User({ username, password, role: role || 'user', phone, email, mustChangePassword: true, createdBy: req.session.username })
      await user.save()
      res.status(201).json({ success: true, user: user.toJSON() })
    } catch (err) {
      res.status(500).json({ error: 'Error al crear usuario' })
    }
  })

  // GET /api/users/:id
  router.get('/users/:id', adminOnly, async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password')
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
      res.json(user)
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener usuario' })
    }
  })

  // PUT /api/users/:id
  router.put('/users/:id', adminOnly, async (req, res) => {
    try {
      const updates = req.body
      if (updates.password) {
        const user = await User.findById(req.params.id)
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
        user.password = updates.password
        await user.save()
        return res.json({ success: true, user: user.toJSON() })
      }
      const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password')
      if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' })
      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: 'Error al actualizar usuario' })
    }
  })

  // DELETE /api/users/:id
  router.delete('/users/:id', adminOnly, async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id)
      res.json({ success: true, message: 'Usuario eliminado' })
    } catch (err) {
      res.status(500).json({ error: 'Error al eliminar usuario' })
    }
  })
}
