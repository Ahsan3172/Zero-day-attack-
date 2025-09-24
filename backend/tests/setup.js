// Test setup file
const { connectDB } = require('../config/database');

// Global test setup
beforeAll(async () => {
  // Setup test database connection
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'test_database';
});

afterAll(async () => {
  // Cleanup after tests
});

// Global mocks
jest.mock('../utils/logger', () => ({
  setupLogging: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

// Mock authentication middleware for testing
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'user' };
    next();
  }
}));