const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const User = require('../src/models/User');

let app;
let mongoServer;
let adminId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.SESSION_SECRET = 'test-secret-key';
  process.env.ADMIN_PASSWORD = 'AdminPass123';

  delete require.cache[require.resolve('../server')];
  app = require('../server');

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
  await mongoServer.stop();
  delete require.cache[require.resolve('../server')];
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
