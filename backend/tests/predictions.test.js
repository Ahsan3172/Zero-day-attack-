const request = require('supertest');
const app = require('../server');
const mlApiService = require('../services/mlApiService');

// Mock ML API service
jest.mock('../services/mlApiService');

describe('Predictions Routes', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass'
      });
    
    authToken = loginResponse.body.token;
  });

  describe('POST /api/predictions/predict', () => {
    it('should make prediction successfully', async () => {
      // Mock ML API response
      mlApiService.predict.mockResolvedValue({
        predictions: [0, 1, 0],
        accuracy: 0.95,
        model_used: 'random_forest'
      });

      const predictionData = {
        model: 'random_forest',
        features: [
          [1, 2, 3, 4, 5],
          [6, 7, 8, 9, 10],
          [11, 12, 13, 14, 15]
        ]
      };

      const response = await request(app)
        .post('/api/predictions/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send(predictionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('predictions');
      expect(response.body).toHaveProperty('accuracy');
      expect(mlApiService.predict).toHaveBeenCalledWith(predictionData);
    });

    it('should handle ML API errors', async () => {
      mlApiService.predict.mockRejectedValue(new Error('ML API Error'));

      const predictionData = {
        model: 'random_forest',
        features: [[1, 2, 3, 4, 5]]
      };

      const response = await request(app)
        .post('/api/predictions/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send(predictionData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('prediction');
    });

    it('should validate prediction data', async () => {
      const response = await request(app)
        .post('/api/predictions/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/predictions/history', () => {
    it('should get prediction history', async () => {
      const response = await request(app)
        .get('/api/predictions/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.predictions)).toBe(true);
    });
  });

  describe('POST /api/predictions/batch', () => {
    it('should handle batch predictions', async () => {
      mlApiService.batchPredict.mockResolvedValue({
        predictions: [0, 1, 0, 1, 0],
        accuracy: 0.92
      });

      const batchData = {
        model: 'isolation_forest',
        dataset_path: '/uploads/test-dataset.csv'
      };

      const response = await request(app)
        .post('/api/predictions/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(batchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('predictions');
    });
  });
});