const request = require('supertest');
const app = require('../server');

describe('Performance Tests', () => {
  describe('Response Times', () => {
    it('should respond to health check within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(request(app).get('/health'));
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // All 10 requests should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Memory Usage', () => {
    it('should not have memory leaks during file upload', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate multiple file uploads
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/datasets/upload')
          .attach('dataset', Buffer.from('test,data\n1,2\n3,4\n'), 'test.csv');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Performance', () => {
    it('should handle database queries efficiently', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/datasets')
        .set('Authorization', 'Bearer valid-token');
      
      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(2000); // Database queries within 2 seconds
    });
  });
});