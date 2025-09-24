const request = require('supertest');
const app = require('../server');

describe('Security Tests', () => {
  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const requests = [];
      
      // Make multiple requests rapidly
      for (let i = 0; i < 20; i++) {
        requests.push(request(app).get('/api/auth/login'));
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize SQL injection attempts', async () => {
      const maliciousInput = {
        username: "admin'; DROP TABLE users; --",
        password: 'password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousInput)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent XSS attacks', async () => {
      const xssPayload = {
        username: '<script>alert("xss")</script>',
        password: 'password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(xssPayload);

      expect(response.body.message).not.toContain('<script>');
    });
  });

  describe('CORS Configuration', () => {
    it('should have proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Authentication Security', () => {
    it('should require valid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/datasets')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = 'expired-jwt-token-here';
      
      const response = await request(app)
        .get('/api/datasets')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      const response = await request(app)
        .post('/api/datasets/upload')
        .attach('dataset', Buffer.from('malicious content'), 'malware.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should limit file sizes', async () => {
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      
      const response = await request(app)
        .post('/api/datasets/upload')
        .attach('dataset', largeBuffer, 'large-file.csv')
        .expect(413);

      expect(response.body.success).toBe(false);
    });
  });
});