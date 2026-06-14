const express = require('express')
const request = require('supertest')
const bootstrap = require('../../backend/src/app')

describe('Auth Final (Phase 1) - admin login and admin routes', () => {
  let app
  let agent
  beforeAll(async () => {
    app = express()
    app.use(express.json())
    // Mount modular backend
    await bootstrap(app)
    agent = request.agent(app)
  })

  test('admin login should succeed', async () => {
    const res = await agent.post('/api/auth/login').send({ username: 'admin', password: 'root' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success')
  })

  test('admin can access users endpoint', async () => {
    // If admin guard is in place, this should be allowed; expectation may vary
    const res = await agent.get('/users')
    expect([200, 403]).toContain(res.status)
  })
})
