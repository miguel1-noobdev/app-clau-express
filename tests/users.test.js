const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { AccessLog } = require('../src/models/Logs');
const app = require('../server');

let adminId;

beforeAll(async () => {
  await app.dbConnectPromise;

  await User.deleteMany({});

  const admin = new User({
    username: 'admin',
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
  });
  await admin.save();
  adminId = admin._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('User management', () => {
  test('Admin can create a user', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'AdminPass123' });

    const res = await agent.post('/api/users').send({
      username: 'newuser',
      password: 'NewUser123',
      role: 'user',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('newuser');
  });

  test('Non-admin cannot create a user', async () => {
    const regularUser = new User({
      username: 'regular',
      password: 'Regular123',
      role: 'user',
    });
    await regularUser.save();

    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({ username: 'regular', password: 'Regular123' });

    const res = await agent.post('/api/users').send({
      username: 'anotheruser',
      password: 'Another123',
      role: 'user',
    });

    expect(res.status).toBe(403);
  });

  test('Supervisor cannot modify/delete the main admin account', async () => {
    const supervisor = new User({
      username: 'supervisor',
      password: 'Supervisor123',
      role: 'supervisor',
    });
    await supervisor.save();

    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({ username: 'supervisor', password: 'Supervisor123' });

    const putRes = await agent.put(`/api/users/${adminId}`).send({
      username: 'admin2',
      role: 'user',
    });

    expect(putRes.status).toBe(403);

    const delRes = await agent.delete(`/api/users/${adminId}`);

    expect(delRes.status).toBe(403);
  });
});

describe('Admin users endpoint', () => {
  test('Supervisor cannot delete main admin via /api/admin/users', async () => {
    const supervisor = new User({
      username: 'supervisor2',
      password: 'Supervisor123',
      role: 'supervisor',
    });
    await supervisor.save();

    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({ username: 'supervisor2', password: 'Supervisor123' });

    const res = await agent.delete(`/api/admin/users/${adminId}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('No se puede modificar la cuenta del administrador principal');
  });
});

describe('Admin access logs pagination', () => {
  test('Pagination returns correct limit and total count', async () => {
    await AccessLog.deleteMany({});
    const logs = [];
    for (let i = 0; i < 14; i += 1) {
      logs.push({
        username: 'admin',
        action: 'login',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date(Date.now() - i * 1000),
      });
    }
    await AccessLog.insertMany(logs);

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'AdminPass123' });

    const res = await agent.get('/api/admin/logs/access?limit=10&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.logs.length).toBe(10);
    expect(res.body.total).toBe(15);
  });
});
