const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Record = require('../src/models/Record');
const { ModificationLog } = require('../src/models/Logs');

let mongoServer;
let adminId;
let regularUserId;
let supervisorId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.SESSION_SECRET = 'test-secret-key';
  process.env.ADMIN_PASSWORD = 'AdminPass123';
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({});
  await Record.deleteMany({});
  await ModificationLog.deleteMany({});
  const admin = new User({ username: 'admin', password: process.env.ADMIN_PASSWORD, role: 'admin' });
  await admin.save();
  adminId = admin._id.toString();
  const regularUser = new User({ username: 'regular', password: 'Regular123', role: 'user' });
  await regularUser.save();
  regularUserId = regularUser._id.toString();
  const supervisor = new User({ username: 'supervisor', password: 'Supervisor123', role: 'supervisor' });
  await supervisor.save();
  supervisorId = supervisor._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

function buildApp(sessionUser) {
  const testApp = express();
  testApp.use(express.json());
  testApp.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { secure: false } }));
  testApp.use((req, res, next) => {
    if (sessionUser) {
      req.session.userId = sessionUser.userId;
      req.session.username = sessionUser.username;
      req.session.role = sessionUser.role;
    }
    next();
  });
  testApp.use('/api/admin', require('../src/routes/admin.routes'));
  return testApp;
}

describe('Admin Routes — Auth & Authorization', () => {
  test('GET /api/admin/users returns 401 when not authenticated', async () => {
    const res = await request(buildApp(null)).get('/api/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No autenticado');
  });

  test('GET /api/admin/users returns 403 for regular user', async () => {
    const res = await request(buildApp({ userId: regularUserId, username: 'regular', role: 'user' })).get('/api/admin/users');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Acceso denegado');
  });
});

describe('Admin Routes — Admin Operations', () => {
  test('GET /api/admin/users returns users list for admin', async () => {
    const res = await request(buildApp({ userId: adminId, username: 'admin', role: 'admin' })).get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(3);
    expect(res.body.users[0].password).toBeUndefined();
  });

  test('POST /api/admin/users creates a new user', async () => {
    const res = await request(buildApp({ userId: adminId, username: 'admin', role: 'admin' }))
      .post('/api/admin/users').send({ username: 'testnewuser', password: 'TestPass123', role: 'user' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('testnewuser');
    expect(res.body.user.mustChangePassword).toBe(true);
  });

  test('PUT /api/admin/users/:id updates a user', async () => {
    const res = await request(buildApp({ userId: adminId, username: 'admin', role: 'admin' }))
      .put(`/api/admin/users/${regularUserId}`).send({ username: 'regularupdated', role: 'user' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('regularupdated');
  });

  test('PUT /api/admin/users/:id/toggle-status toggles user status', async () => {
    const res = await request(buildApp({ userId: adminId, username: 'admin', role: 'admin' }))
      .put(`/api/admin/users/${regularUserId}/toggle-status`).send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.user.isActive).toBe('boolean');
  });

  test('DELETE /api/admin/users/:id deletes a user', async () => {
    const tempUser = new User({ username: 'tempdelete', password: 'Temp12345', role: 'user' });
    await tempUser.save();
    const res = await request(buildApp({ userId: adminId, username: 'admin', role: 'admin' }))
      .delete(`/api/admin/users/${tempUser._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Usuario eliminado correctamente');
  });

  test('Supervisor cannot delete main admin account', async () => {
    const res = await request(buildApp({ userId: supervisorId, username: 'supervisor', role: 'supervisor' }))
      .delete(`/api/admin/users/${adminId}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('No se puede modificar la cuenta del administrador principal');
  });

  test('GET /api/admin/logs/access returns paginated logs', async () => {
    const res = await request(buildApp({ userId: adminId, username: 'admin', role: 'admin' }))
      .get('/api/admin/logs/access?limit=10&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });
});

describe('Admin Routes — Record Administration', () => {
  let recordId;

  beforeEach(async () => {
    await Record.deleteMany({});
    const record = new Record({ userId: regularUserId, fecha: new Date(), horaInicio: '08:00', horaFin: '17:00', totalHoras: 9, parador: 'Test', notas: 'Test record' });
    await record.save();
    recordId = record._id.toString();
  });

  test('PUT /api/admin/records/:id/admin-edit edits a record and creates log', async () => {
    const res = await request(buildApp({ userId: adminId, username: 'admin', role: 'admin' }))
      .put(`/api/admin/records/${recordId}/admin-edit`).send({ parador: 'Updated', notas: 'Updated notes', reason: 'Test edit' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.record).toBeDefined();
    expect(res.body.logId).toBeDefined();
    const log = await ModificationLog.findById(res.body.logId);
    expect(log).not.toBeNull();
    expect(log.action).toBe('edit');
    expect(log.adminUsername).toBe('admin');
  });

  test('DELETE /api/admin/records/:id/admin-delete deletes a record and creates log', async () => {
    const res = await request(buildApp({ userId: adminId, username: 'admin', role: 'admin' }))
      .delete(`/api/admin/records/${recordId}/admin-delete`).send({ reason: 'Test delete' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.logId).toBeDefined();
    const record = await Record.findById(recordId);
    expect(record).toBeNull();
  });
});
