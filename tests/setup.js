const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.SESSION_SECRET = 'test-secret-key';
  process.env.ADMIN_PASSWORD = 'AdminPass123';
  global.__MONGOINSTANCE__ = mongoServer;
};
