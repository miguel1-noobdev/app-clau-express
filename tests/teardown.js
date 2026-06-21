module.exports = async () => {
  const mongoServer = global.__MONGOINSTANCE__;
  if (mongoServer) {
    await mongoServer.stop();
  }
};
