const express = require('express')
const setupApp = require('./app')

// Create a new router to mount in the main server later
const router = express.Router()

// Placeholder: future version will mount actual v1 routes
router.get('/', (req, res) => {
  res.json({ ok: true, message: 'CLAUDIA Express backend modular scaffold' })
})

module.exports = { router, setupApp }
