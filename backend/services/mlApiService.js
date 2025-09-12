const axios = require('axios');
const { logger } = require('../utils/logger');

class MLAPIService {
  constructor() {
    this.baseURL = process.env.ML_API_URL || 'http://localhost:8000';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 120000, // 120 seconds timeout for all operations
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Health check for ML API
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('ML API health check failed:', error.message);
      throw new Error('ML API is not available');
    }
  }

  // Get available models
  async getAvailableModels() {
    try {
      const response = await this.client.get('/api/v1/models');
      return response.data;
    } catch (error) {
      logger.error('Error getting available models:', error.message);
      throw error;
    }
  }

  // Get model details
  async getModelDetails(modelName) {
    try {
      const response = await this.client.get(`/api/v1/models/${modelName}`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting model details for ${modelName}:`, error.message);
      throw error;
    }
  }

  // Get model performance
  async getModelPerformance(modelName) {
    try {
      const response = await this.client.get(`/api/v1/models/${modelName}/performance`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting performance for ${modelName}:`, error.message);
      throw error;
    }
  }

  // Compare models
  async compareModels(modelNames) {
    try {
      const queryParams = modelNames.map(name => `model_names=${encodeURIComponent(name)}`).join('&');
      const response = await this.client.get(`/api/v1/models/compare?${queryParams}`);
      return response.data;
    } catch (error) {
      logger.error('Error comparing models:', error.message);
      throw error;
    }
  }

  // Upload dataset
  async uploadDataset(fileBuffer, filename) {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await this.client.post('/api/v1/data/upload', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Error uploading dataset:', error.message);
      throw error;
    }
  }

  // Start model training
  async startTraining(trainingConfig) {
    try {
      const response = await this.client.post('/api/v1/train', trainingConfig);
      return response.data;
    } catch (error) {
      logger.error('Error starting training:', error.message);
      throw error;
    }
  }

  // Get training status
  async getTrainingStatus(taskId) {
    try {
      // Use shorter timeout for status checks (10 seconds)
      const response = await this.client.get(`/api/v1/train/status/${taskId}`, {
        timeout: 10000 // 10 seconds for status checks
      });
      return response.data;
    } catch (error) {
      logger.error(`Error getting training status for ${taskId}:`, error.message);
      
      // If timeout, return a default status instead of throwing
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        logger.warn(`Status request timeout for ${taskId}, returning default status`);
        return {
          success: true,
          data: {
            task_id: taskId,
            status: "in_progress",
            progress: 50,
            message: "Training in progress (status check timeout)",
            current_model: "unknown",
            models_completed: []
          }
        };
      }
      
      throw error;
    }
  }

  // Get training history
  async getTrainingHistory(limit = 10) {
    try {
      const response = await this.client.get(`/api/v1/train/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting training history:', error.message);
      throw error;
    }
  }

  // Quick train single model
  async quickTrainModel(modelType, datasetPath = null) {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('model_type', modelType);
      if (datasetPath) {
        formData.append('dataset_path', datasetPath);
      }

      const response = await this.client.post('/api/v1/train/quick', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
      return response.data;
    } catch (error) {
      logger.error(`Error quick training ${modelType}:`, error.message);
      throw error;
    }
  }

  // Make single prediction
  async predictSingle(data, modelType = 'random_forest') {
    try {
      const response = await this.client.post('/api/v1/predict/single', {
        data,
        model_type: modelType
      });
      return response.data;
    } catch (error) {
      logger.error('Error making single prediction:', error.message);
      throw error;
    }
  }

  // Make batch predictions
  async predictBatch(dataArray, modelType = 'random_forest') {
    try {
      const response = await this.client.post('/api/v1/predict/batch', {
        data: dataArray,
        model_type: modelType
      });
      return response.data;
    } catch (error) {
      logger.error('Error making batch predictions:', error.message);
      throw error;
    }
  }

  // Predict from file
  async predictFromFile(fileBuffer, filename, modelType = 'random_forest') {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);
      formData.append('model_type', modelType);

      const response = await this.client.post('/api/v1/predict/file', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Error predicting from file:', error.message);
      throw error;
    }
  }

  // Ensemble prediction
  async predictEnsemble(dataArray, modelTypes = ['random_forest', 'isolation_forest']) {
    try {
      const response = await this.client.post('/api/v1/predict/ensemble', {
        data: dataArray,
        model_types: modelTypes
      });
      return response.data;
    } catch (error) {
      logger.error('Error making ensemble predictions:', error.message);
      throw error;
    }
  }

  // Real-time stream processing
  async processRealtimeStream(dataArray, modelType = 'random_forest', thresholdConfidence = 0.8) {
    try {
      const response = await this.client.post('/api/v1/predict/realtime/stream', dataArray, {
        params: {
          model_type: modelType,
          threshold_confidence: thresholdConfidence
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error processing realtime stream:', error.message);
      throw error;
    }
  }

  // Get prediction history
  async getPredictionHistory(limit = 10) {
    try {
      const response = await this.client.get(`/api/v1/predict/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting prediction history:', error.message);
      throw error;
    }
  }

  // Delete model
  async deleteModel(modelName) {
    try {
      const response = await this.client.delete(`/api/v1/models/${modelName}`);
      return response.data;
    } catch (error) {
      logger.error(`Error deleting model ${modelName}:`, error.message);
      throw error;
    }
  }

  // Get data statistics
  async getDataStatistics() {
    try {
      const response = await this.client.get('/api/v1/data/statistics');
      return response.data;
    } catch (error) {
      logger.error('Error getting data statistics:', error.message);
      throw error;
    }
  }

  // Get model recommendations
  async getModelRecommendations(useCase = null, datasetSize = null) {
    try {
      const params = new URLSearchParams();
      if (useCase) params.append('use_case', useCase);
      if (datasetSize) params.append('dataset_size', datasetSize);
      
      const response = await this.client.get(`/api/v1/models/recommendations?${params}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting model recommendations:', error.message);
      throw error;
    }
  }

  // Start training models
  async startTraining(trainingRequest) {
    try {
      const response = await this.client.post('/api/v1/train', trainingRequest);
      
      console.log('Raw ML API Response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error) {
      logger.error('Error starting training:', error.message);
      throw error;
    }
  }

  // Get training status
  async getTrainingStatus(taskId) {
    try {
      const response = await this.client.get(`/api/v1/train/status/${taskId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting training status for ${taskId}:`, error.message);
      throw error;
    }
  }

  // Get active training tasks
  async getActiveTrainingTasks() {
    try {
      const response = await this.client.get('/api/v1/train/active');
      return response.data;
    } catch (error) {
      logger.error('Error getting active training tasks:', error.message);
      throw error;
    }
  }

  // Get training history
  async getTrainingHistory(limit = 10) {
    try {
      const response = await this.client.get(`/api/v1/train/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting training history:', error.message);
      throw error;
    }
  }

  // Cancel training
  async cancelTraining(taskId) {
    try {
      const response = await this.client.delete(`/api/v1/train/cancel/${taskId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error cancelling training for ${taskId}:`, error.message);
      throw error;
    }
  }

  // Get training recommendations
  async getTrainingRecommendations(datasetSize = null, priority = null) {
    try {
      const params = new URLSearchParams();
      if (datasetSize) params.append('dataset_size', datasetSize);
      if (priority) params.append('priority', priority);
      
      const response = await this.client.get(`/api/v1/train/recommendations?${params}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting training recommendations:', error.message);
      throw error;
    }
  }

  // Delete training job
  async deleteTrainingJob(taskId) {
    try {
      const response = await this.client.delete(`/api/v1/train/${taskId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error deleting training job ${taskId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new MLAPIService();
