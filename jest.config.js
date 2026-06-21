module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/setup.js',
  globalTeardown: '<rootDir>/tests/teardown.js',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/frontend/',
    '/docs/',
  ],
};
