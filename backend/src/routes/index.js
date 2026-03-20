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

module.exports = router
