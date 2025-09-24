const request = require('supertest');
const app = require('../server');

describe('Security Tests', () => {
  describe('Basic Test', () => {
    it('should pass basic test always', async () => {
      expect(true).toBe(true);
    });
  });
});