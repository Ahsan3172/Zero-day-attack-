const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs');

describe('Dataset Routes', () => {
  let authToken;

  beforeAll(async () => {
    // Get auth token for protected routes
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass'
      });
    
    authToken = loginResponse.body.token;
  });

  describe('POST /api/datasets/upload', () => {
    it('should upload CSV file successfully', async () => {
      const testCsvPath = path.join(__dirname, 'fixtures', 'test-dataset.csv');
      
      // Create test CSV file if it doesn't exist
      if (!fs.existsSync(testCsvPath)) {
        const csvContent = 'feature1,feature2,feature3,label\n1,2,3,normal\n4,5,6,attack\n';
        fs.writeFileSync(testCsvPath, csvContent);
      }

      const response = await request(app)
        .post('/api/datasets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('dataset', testCsvPath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('path');
    });

    it('should reject non-CSV files', async () => {
      const testTxtPath = path.join(__dirname, 'fixtures', 'test-file.txt');
      fs.writeFileSync(testTxtPath, 'This is not a CSV file');

      const response = await request(app)
        .post('/api/datasets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('dataset', testTxtPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('CSV');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/datasets/upload')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/datasets', () => {
    it('should list uploaded datasets', async () => {
      const response = await request(app)
        .get('/api/datasets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.datasets)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/datasets')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/datasets/:id', () => {
    it('should delete dataset successfully', async () => {
      const response = await request(app)
        .delete('/api/datasets/test-dataset-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});