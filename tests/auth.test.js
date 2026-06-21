const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const app = require('../server');

beforeAll(async () => {
  await app.dbConnectPromise;
  await User.deleteMany({});

  const admin = new User({
    username: 'admin',
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
  });
  await admin.save();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('POST /api/auth/login', () => {
  test('returns success with valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'AdminPass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns error with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/auth/me', () => {
  test('returns user when authenticated', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'AdminPass123' });

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
  });

  test('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });
});
