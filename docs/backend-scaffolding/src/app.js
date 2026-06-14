// Simple modular bootstrap for CLAUDIA Express
// If you want to enable modular backend, require this file from server.js
module.exports = async function(app) {
  try {
    const routes = require('./routes/index')
    app.use('/api/v1', routes)
    // Seed admin user for initial bootstrap if using modular backend models
    try {
      const models = require('./models')
      const User = models && models.User ? models.User : null
      if (User) {
        const existing = await User.findOne({ username: 'admin' })
        if (!existing) {
          const admin = new User({ username: 'admin', password: 'root', role: 'admin' })
          await admin.save()
          console.log('✅ Admin user created: admin/root (modular bootstrap)')
        }
      }
    } catch (seedErr) {
      console.log('ℹ Could not seed admin in modular bootstrap:', seedErr.message)
    }
  } catch (e) {
    // swallow errors if routes not ready yet
  }
}
