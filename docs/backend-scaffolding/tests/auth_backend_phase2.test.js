const express = require('express')
const request = require('supertest')
const bootstrap = require('../src/app')

describe('Auth Phase 2 - Backend bootstrap', () => {
  let app
  let agent

  beforeAll(async () => {
    app = express()
    app.use(express.json())
    await bootstrap(app)
    agent = request.agent(app)
  })

  test('admin login succeeds', async () => {
    const res = await agent.post('/api/auth/login').send({ username: 'admin', password: 'root' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success')
  })

  test('get current user after login', async () => {
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('username')
  })
})
