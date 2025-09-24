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
  }),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock database
const mockUsers = [
  { id: 1, username: 'testuser', email: 'test@example.com', password_hash: '$2b$10$hashedpassword', role: 'user', status: 'approved' },
  { id: 2, username: 'admin', email: 'admin@example.com', password_hash: '$2b$10$hashedpassword', role: 'admin', status: 'approved' }
];

const mockDatasets = [
  { id: 1, name: 'test-dataset', filename: 'test.csv', path: '/uploads/test.csv', user_id: 1, created_at: new Date() }
];

const mockPredictions = [
  { id: 1, user_id: 1, model_type: 'random_forest', prediction_result: 1, confidence: 0.95, created_at: new Date() }
];

jest.mock('../config/database', () => ({
  connectDB: jest.fn().mockResolvedValue({}),
  executeQuery: jest.fn().mockImplementation((query, params) => {
    // Mock different queries based on the query string
    if (query.includes('SELECT') && query.includes('users') && query.includes('username')) {
      return Promise.resolve(mockUsers.filter(u => u.username === params[0]));
    }
    if (query.includes('SELECT') && query.includes('users') && query.includes('email')) {
      return Promise.resolve(mockUsers.filter(u => u.email === params[0]));
    }
    if (query.includes('SELECT') && query.includes('datasets')) {
      return Promise.resolve(mockDatasets);
    }
    if (query.includes('SELECT') && query.includes('predictions')) {
      return Promise.resolve(mockPredictions);
    }
    if (query.includes('INSERT INTO users')) {
      return Promise.resolve({ insertId: 3, affectedRows: 1 });
    }
    if (query.includes('INSERT INTO datasets')) {
      return Promise.resolve({ insertId: 2, affectedRows: 1 });
    }
    if (query.includes('DELETE')) {
      return Promise.resolve({ affectedRows: 1 });
    }
    return Promise.resolve([]);
  }),
  getConnection: jest.fn(),
  closeConnection: jest.fn()
}));

// Mock authentication middleware for testing
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'admin' };
    next();
  },
  requireRole: (roles) => (req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'admin' };
    next();
  },
  requireUser: (req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'user' };
    next();
  }
}));

// Mock ML API Service 
jest.mock('../services/mlApiService', () => ({
  uploadDataset: jest.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
  trainModel: jest.fn().mockResolvedValue({ success: true, data: { model_id: 1 } }),
  makePrediction: jest.fn().mockResolvedValue({ success: true, data: { prediction: 1 } }),
  predict: jest.fn().mockResolvedValue({ success: true, data: { predictions: [0, 1, 0], accuracy: 0.95, model_used: 'random_forest' } }),
  batchPredict: jest.fn().mockResolvedValue({ success: true, data: { predictions: [0, 1, 0, 1, 0], accuracy: 0.92 } }),
  getModelInfo: jest.fn().mockResolvedValue({ success: true, data: { model: 'random_forest' } }),
  validateDataset: jest.fn().mockResolvedValue({ success: true, data: { valid: true } })
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockImplementation((password, hash) => {
    return Promise.resolve(password === 'testpass123');
  })
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 1, role: 'user' })
}));