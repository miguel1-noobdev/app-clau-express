const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Record = require('../src/models/Record');
const { ModificationLog } = require('../src/models/Logs');
const app = require('../server');

beforeAll(async () => {
  await app.dbConnectPromise;

  await User.deleteMany({});
  await Record.deleteMany({});

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

describe('Records', () => {
  test('User can create a record', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'AdminPass123' });

    const res = await agent.post('/api/records').send({
      fecha: '2024-01-01',
      horaInicio: '08:00',
      horaFin: '16:00',
      totalHoras: 8,
      parador: 'Zona Norte',
    });

    expect(res.status).toBe(201);
    expect(res.body.parador).toBe('Zona Norte');
    expect(res.body.userId).toBeDefined();
  });

  test('User cannot inject userId when updating a record', async () => {
    const recordUser = new User({
      username: 'recorduser',
      password: 'Record123',
      role: 'user',
    });
    await recordUser.save();

    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({ username: 'recorduser', password: 'Record123' });

    const createRes = await agent.post('/api/records').send({
      fecha: '2024-01-02',
      horaInicio: '09:00',
      horaFin: '17:00',
      totalHoras: 8,
      parador: 'Zona Sur',
    });

    const recordId = createRes.body._id;
    const originalUserId = createRes.body.userId;

    const updateRes = await agent.put(`/api/records/${recordId}`).send({
      parador: 'Zona Este',
      userId: new mongoose.Types.ObjectId().toString(),
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.parador).toBe('Zona Este');

    const recordInDb = await Record.findById(recordId);
    expect(recordInDb.userId.toString()).toBe(originalUserId);
  });
});

describe('Admin record management', () => {
  test('Admin edits record and creates ModificationLog', async () => {
    const regularUser = new User({
      username: 'regularrecord',
      password: 'Regular123',
      role: 'user',
    });
    await regularUser.save();

    const record = new Record({
      userId: regularUser._id,
      fecha: '2024-06-01',
      horaInicio: '08:00',
      horaFin: '16:00',
      totalHoras: 8,
      parador: 'Zona Centro',
      notas: 'Nota original',
    });
    await record.save();
    const recordId = record._id.toString();

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'AdminPass123' });

    const res = await agent
      .put(`/api/admin/records/${recordId}/admin-edit`)
      .send({ parador: 'Zona Oeste', notas: 'Nota actualizada', reason: 'Test reason' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.record).toBeDefined();
    expect(res.body.logId).toBeDefined();

    const log = await ModificationLog.findById(res.body.logId);
    expect(log).not.toBeNull();
    expect(log.action).toBe('edit');
    expect(log.adminUsername).toBe('admin');
    expect(log.targetUsername).toBe('regularrecord');
  });
});
