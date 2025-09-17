const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');
const mlApiService = require('../services/mlApiService');

const router = express.Router();

// @route   GET /api/models
// @desc    Get all available ML models
// @access  Private
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    // Get training jobs from database
    let query = `
      SELECT m.id, m.task_id, m.user_id, m.model_types, 
             m.status, m.progress, m.current_model, m.message,
             m.models_completed, m.created_at, m.updated_at, m.completed_at,
             u.username as created_by
      FROM ml_models m
      JOIN users u ON m.user_id = u.id
    `;
    let params = [];

    if (status) {
      query += ' WHERE m.status = ?';
      params.push(status);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const trainingJobs = await executeQuery(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM ml_models';
    let countParams = [];
    if (status) {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }
    
    const [{ total }] = await executeQuery(countQuery, countParams);

    // Read saved models metadata
    const savedModelsPath = path.join(__dirname, '../../api/saved_models');
    const metadataPath = path.join(savedModelsPath, 'models_metadata.json');
    let savedModels = [];
    
    try {
      if (fs.existsSync(metadataPath)) {
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        // Transform saved models data
        savedModels = Object.entries(metadata).map(([modelName, modelData]) => ({
          id: modelName,
          name: modelName.charAt(0).toUpperCase() + modelName.slice(1).replace(/_/g, ' '),
          type: modelName.replace(/_/g, ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          accuracy: (modelData.performance?.accuracy * 100).toFixed(1) + '%' || 'N/A',
          status: fs.existsSync(path.join(savedModelsPath, modelData.path)) ? 'active' : 'inactive',
          lastTrained: modelData.created_at ? new Date(modelData.created_at).toLocaleDateString() : 'Unknown',
          description: `${modelName.replace(/_/g, ' ').charAt(0).toUpperCase() + modelName.slice(1).replace(/_/g, ' ')} model for anomaly detection`,
          performance: modelData.performance || null,
          path: modelData.path
        }));
      }
    } catch (error) {
      logger.error('Error reading saved models metadata:', error);
    }

    res.json({
      success: true,
      message: 'Models retrieved successfully',
      data: {
        saved_models: savedModels,
        training_jobs: trainingJobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve models'
    });
  }
});

// @route   GET /api/models/training-history
// @desc    Get training job history
// @access  Private
router.get('/training-history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let query = `
      SELECT tj.id, tj.task_id, tj.current_model as model_name, tj.model_types as algorithm, 
             tj.status, tj.progress, tj.created_at, tj.updated_at, tj.completed_at, 
             tj.error_details as error_message, tj.models_completed as model_paths, 
             tj.message as metrics, u.username as created_by
      FROM ml_models tj
      LEFT JOIN users u ON tj.user_id = u.id
    `;
    let params = [];

    if (status) {
      query += ' WHERE tj.status = ?';
      params.push(status);
    }

    query += ' ORDER BY tj.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const jobs = await executeQuery(query, params);

    // Parse JSON fields safely
    const processedJobs = jobs.map(job => {
      let model_paths = null;
      let metrics = null;
      let algorithm = null;
      
      try {
        // models_completed is JSON array of completed models
        model_paths = job.model_paths ? JSON.parse(job.model_paths) : null;
      } catch (e) {
        logger.error('Error parsing model_paths:', e);
      }
      
      try {
        // model_types is JSON array of algorithms being trained
        algorithm = job.algorithm ? JSON.parse(job.algorithm) : null;
      } catch (e) {
        logger.error('Error parsing algorithm:', e);
      }
      
      try {
        // Use message field as metrics placeholder
        metrics = job.metrics ? (typeof job.metrics === 'string' ? { message: job.metrics } : job.metrics) : null;
      } catch (e) {
        logger.error('Error parsing metrics:', e);
      }
      
      return {
        ...job,
        algorithm: Array.isArray(algorithm) ? algorithm.join(', ') : (algorithm || 'Unknown'),
        model_paths,
        metrics
      };
    });

    // Return empty array if no jobs
    res.json({ success: true, data: processedJobs });
  } catch (error) {
    logger.error('❌ Error fetching training history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch training history',
      error: error.message,
      stack: error.stack
    });
  }
});

// @route   GET /api/models/results
// @desc    Get user's prediction results
// @access  Private
router.get('/results', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const resultsRaw = await executeQuery(`
      SELECT mr.id, mr.accuracy, mr.precision_score, mr.recall_score, mr.f1_score,
             mr.execution_time, mr.created_at,
             mr.confusion_matrix, mr.classification_report, mr.prediction_results,
             m.task_id as model_name, m.current_model as algorithm,
             d.original_name as dataset_name
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      WHERE mr.user_id = ?
      ORDER BY mr.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, limit, offset]);

    // Parse JSON fields for each result
    const results = resultsRaw.map(r => ({
      ...r,
      confusion_matrix: typeof r.confusion_matrix === 'string' ? JSON.parse(r.confusion_matrix) : r.confusion_matrix,
      classification_report: typeof r.classification_report === 'string' ? JSON.parse(r.classification_report) : r.classification_report,
      prediction_results: typeof r.prediction_results === 'string' ? JSON.parse(r.prediction_results) : r.prediction_results,
      accuracy: typeof r.accuracy === 'string' ? Number(r.accuracy) : r.accuracy,
      precision_score: typeof r.precision_score === 'string' ? Number(r.precision_score) : r.precision_score,
      recall_score: typeof r.recall_score === 'string' ? Number(r.recall_score) : r.recall_score,
      f1_score: typeof r.f1_score === 'string' ? Number(r.f1_score) : r.f1_score,
      execution_time: typeof r.execution_time === 'string' ? Number(r.execution_time) : r.execution_time
    }));

    const [{ total }] = await executeQuery(
      'SELECT COUNT(*) as total FROM model_results WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Results retrieved successfully',
      data: {
        results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve results'
    });
  }
});

// @route   GET /api/models/results/:resultId/download
// @desc    Download a specific test result as PDF
// @access  Private
router.get('/results/:resultId/download', async (req, res) => {
  try {
    const { resultId } = req.params;
    const format = req.query.format || 'pdf'; // pdf or json

    // Get the result data
    const results = await executeQuery(`
      SELECT mr.*, 
             m.task_id as model_name, m.current_model as algorithm,
             d.original_name as dataset_name
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      WHERE mr.id = ? AND mr.user_id = ?
    `, [resultId, req.user.id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    const result = results[0];

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="test-result-${resultId}.json"`);
      return res.json(result);
    }

    // For PDF format, we'll return the data structure for now
    // In a real implementation, you'd use a PDF generation library like puppeteer or jsPDF
    const reportData = {
      title: `Test Result Report - ${result.model_name}`,
      generatedAt: new Date().toISOString(),
      testInfo: {
        testId: result.id,
        modelName: result.model_name,
        algorithm: result.algorithm,
        datasetName: result.dataset_name,
        executionTime: result.execution_time,
        testDate: result.created_at
      },
      metrics: {
        accuracy: result.accuracy,
        precision: result.precision_score,
        recall: result.recall_score,
        f1Score: result.f1_score
      },
      detailedResults: {
        confusionMatrix: result.confusion_matrix,
        classificationReport: result.classification_report,
        predictionResults: result.prediction_results
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="test-result-${resultId}.json"`);
    res.json(reportData);

  } catch (error) {
    logger.error('Error downloading result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download result'
    });
  }
});

// @route   GET /api/models/:id
// @desc    Get specific model details
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const models = await executeQuery(`
      SELECT m.*, u.username as created_by_username
      FROM ml_models m
      JOIN users u ON m.created_by = u.id
      WHERE m.id = ?
    `, [id]);

    if (models.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    // Get recent results for this model
    const recentResults = await executeQuery(`
      SELECT mr.id, mr.accuracy, mr.precision_score, mr.recall_score, mr.f1_score,
             mr.execution_time, mr.created_at, u.username as tested_by,
             d.original_name as dataset_name
      FROM model_results mr
      JOIN users u ON mr.user_id = u.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      WHERE mr.model_id = ?
      ORDER BY mr.created_at DESC
      LIMIT 10
    `, [id]);

    // Get training logs
    const trainingLogs = await executeQuery(`
      SELECT log_message, log_level, created_at
      FROM training_logs
      WHERE model_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [id]);

    res.json({
      success: true,
      message: 'Model retrieved successfully',
      data: {
        model: models[0],
        recentResults,
        trainingLogs
      }
    });

  } catch (error) {
    logger.error('Error fetching model details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve model details'
    });
  }
});

// @route   POST /api/models/:id/predict
// @desc    Run prediction on a dataset using specific model
// @access  Private
router.post('/:id/predict', async (req, res) => {
  try {
    const { id: modelId } = req.params;
    const { datasetId } = req.body;

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: 'Dataset ID is required'
      });
    }

    // Check if model exists and is ready
    const models = await executeQuery(
      'SELECT * FROM ml_models WHERE id = ? AND status = "ready"',
      [modelId]
    );

    if (models.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Model not found or not ready'
      });
    }

    const model = models[0];

    // Check if dataset exists
    const datasets = await executeQuery(
      'SELECT * FROM dataset_uploads WHERE id = ? AND status = "processed"',
      [datasetId]
    );

    if (datasets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found or not processed'
      });
    }

    const dataset = datasets[0];

    // Create a new result record
    const resultRecord = await executeQuery(`
      INSERT INTO model_results (model_id, dataset_id, user_id)
      VALUES (?, ?, ?)
    `, [modelId, datasetId, req.user.id]);

    const resultId = resultRecord.insertId;

    // Here you would typically call your Python ML script
    // For now, we'll simulate the process and return mock results
    
    // Simulate processing time
    setTimeout(async () => {
      try {
        // Mock results - in real implementation, these would come from your Python script
        const mockResults = {
          accuracy: Math.random() * 0.3 + 0.7, // Random accuracy between 0.7-1.0
          precision_score: Math.random() * 0.3 + 0.65,
          recall_score: Math.random() * 0.3 + 0.68,
          f1_score: Math.random() * 0.3 + 0.66,
          confusion_matrix: [
            [850, 23],
            [45, 892]
          ],
          classification_report: {
            'Normal': { precision: 0.95, recall: 0.97, 'f1-score': 0.96, support: 873 },
            'Attack': { precision: 0.97, recall: 0.95, 'f1-score': 0.96, support: 937 }
          },
          execution_time: Math.random() * 10 + 5 // 5-15 seconds
        };

        // Update the result record
        await executeQuery(`
          UPDATE model_results 
          SET accuracy = ?, precision_score = ?, recall_score = ?, f1_score = ?,
              confusion_matrix = ?, classification_report = ?, 
              prediction_results = ?, execution_time = ?
          WHERE id = ?
        `, [
          mockResults.accuracy.toFixed(4),
          mockResults.precision_score.toFixed(4),
          mockResults.recall_score.toFixed(4),
          mockResults.f1_score.toFixed(4),
          JSON.stringify(mockResults.confusion_matrix),
          JSON.stringify(mockResults.classification_report),
          JSON.stringify({ predicted_labels: 'Mock predictions would be here' }),
          mockResults.execution_time.toFixed(3),
          resultId
        ]);

        logger.info(`Model prediction completed for user ${req.user.username}`);
        
      } catch (error) {
        logger.error('Error updating prediction results:', error);
      }
    }, 2000); // Simulate 2-second processing time

    res.status(202).json({
      success: true,
      message: 'Prediction started successfully',
      data: {
        resultId,
        modelName: model.name,
        datasetName: dataset.original_name,
        status: 'processing'
      }
    });

  } catch (error) {
    logger.error('Error starting prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start prediction'
    });
  }
});

// @route   GET /api/models/results/:resultId
// @desc    Get prediction result
// @access  Private
router.get('/results/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;

    const results = await executeQuery(`
      SELECT mr.*, m.name as model_name, m.algorithm,
             d.original_name as dataset_name, u.username
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      JOIN users u ON mr.user_id = u.id
      WHERE mr.id = ?
    `, [resultId]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    const result = results[0];

    // Check if user owns the result or is admin
    if (result.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Parse JSON fields
    const processedResult = {
      ...result,
      confusion_matrix: result.confusion_matrix ? JSON.parse(result.confusion_matrix) : null,
      classification_report: result.classification_report ? JSON.parse(result.classification_report) : null,
      prediction_results: result.prediction_results ? JSON.parse(result.prediction_results) : null
    };

    res.json({
      success: true,
      message: 'Result retrieved successfully',
      data: processedResult
    });

  } catch (error) {
    logger.error('Error fetching result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve result'
    });
  }
});



// @route   DELETE /api/models/results/:resultId
// @desc    Delete a prediction result
// @access  Private
router.delete('/results/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;

    // Check if result exists and user owns it
    const results = await executeQuery(
      'SELECT user_id FROM model_results WHERE id = ?',
      [resultId]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    const result = results[0];

    // Check if user owns the result or is admin
    if (result.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete the result
    await executeQuery('DELETE FROM model_results WHERE id = ?', [resultId]);

    logger.info(`User ${req.user.username} deleted result ${resultId}`);

    res.json({
      success: true,
      message: 'Result deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete result'
    });
  }
});

// @route   POST /api/models/train
// @desc    Start model training
// @access  Private (Admin only)
router.post('/train', async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { dataset_path, model_types, test_size = 0.2, random_state = 42 } = req.body;

    // Validate required fields
    if (!model_types || !Array.isArray(model_types) || model_types.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'model_types is required and must be a non-empty array'
      });
    }

    // Validate model types
    const validModels = ['random_forest', 'isolation_forest', 'one_class_svm', 'autoencoder'];
    const invalidModels = model_types.filter(model => !validModels.includes(model));
    if (invalidModels.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid model types: ${invalidModels.join(', ')}. Valid options: ${validModels.join(', ')}`
      });
    }

    // Start training via ML API
    const trainingRequest = {
      dataset_path,
      model_types,
      test_size: parseFloat(test_size),
      random_state: parseInt(random_state)
    };

    // Call ML API to start training
    const mlResponse = await mlApiService.startTraining(trainingRequest);
    
    console.log('ML API Response:', JSON.stringify(mlResponse, null, 2));
    
    // The ML API returns: { success: true, task_id: "...", status: "started", message: "..." }
    if (!mlResponse.success || !mlResponse.task_id) {
      console.error('Invalid ML API response:', mlResponse);
      throw new Error('Failed to start training: Invalid ML API response format');
    }

    const taskId = mlResponse.task_id;

    // Store training job in database
    await executeQuery(`
      INSERT INTO ml_models (
        task_id, user_id, dataset_path, model_types, 
        test_size, random_state, status, message
      ) VALUES (?, ?, ?, ?, ?, ?, 'started', 'Training job initialized')
    `, [
      taskId, 
      req.user.id, 
      dataset_path || null, 
      JSON.stringify(model_types),
      test_size,
      random_state
    ]);

    logger.info(`Training started by user ${req.user.username} with task ID: ${taskId}`);

    res.json({
      success: true,
      message: 'Training started successfully',
      data: {
        task_id: taskId,
        status: 'started',
        model_types,
        dataset_path
      }
    });

  } catch (error) {
    logger.error('Error starting training:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start training'
    });
  }
});

// @route   GET /api/models/train/status/:taskId
// @desc    Get training status (non-blocking, instant response)
// @access  Private (Admin only)
router.get('/train/status/:taskId', async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { taskId } = req.params;

    // Get current status from database
    const jobs = await executeQuery(
      'SELECT * FROM ml_models WHERE task_id = ? AND user_id = ?',
      [taskId, req.user.id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Training job not found'
      });
    }

    const currentJob = jobs[0];
    
    // Prepare response with current DB status
    let statusData = {
      task_id: taskId,
      status: currentJob.status,
      progress: currentJob.progress || 0,
      current_model: currentJob.current_model,
      message: currentJob.message || 'Training in progress',
      models_completed: JSON.parse(currentJob.models_completed || '[]'),
      created_at: currentJob.created_at,
      completed_at: currentJob.completed_at
    };

    // Only try to update from ML API if status is active and not too frequent
    if (currentJob.status === 'started' || currentJob.status === 'in_progress') {
      try {
        // Make a quick, non-blocking call to ML API for fresh status
        const mlResponse = await mlApiService.getTrainingStatus(taskId);
        
        if (mlResponse.success && mlResponse.data) {
          const mlStatusData = mlResponse.data;
          
          // Update database in background (don't wait for it)
          executeQuery(`
            UPDATE ml_models SET 
              status = ?, 
              progress = ?, 
              current_model = ?, 
              message = ?, 
              models_completed = ?,
              model_paths = ?,
              metrics = ?,
              completed_at = CASE 
                WHEN ? IN ('completed', 'failed') AND completed_at IS NULL 
                THEN NOW() 
                ELSE completed_at 
              END
            WHERE task_id = ?
          `, [
            mlStatusData.status,
            mlStatusData.progress || 0,
            mlStatusData.current_model || null,
            mlStatusData.message || '',
            JSON.stringify(mlStatusData.models_completed || []),
            JSON.stringify(mlStatusData.model_paths || {}),
            JSON.stringify(mlStatusData.model_metrics || {}),
            mlStatusData.status,
            taskId
          ]).catch(err => logger.error('Error updating training job:', err));

          // Return fresh data from ML API
          statusData = mlStatusData;
        }
      } catch (error) {
        // Log error but don't fail the request - return DB status
        logger.warn(`Failed to fetch fresh status for ${taskId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Training status retrieved successfully',
      data: statusData
    });

  } catch (error) {
    logger.error('Error getting training status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get training status'
    });
  }
});

// @route   GET /api/models/train/history
// @desc    Get training history
// @access  Private (Admin only)
router.get('/train/history', async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Get training history from database
    const jobs = await executeQuery(`
      SELECT tj.*, u.username as created_by_username
      FROM ml_models tj
      JOIN users u ON tj.user_id = u.id
      ORDER BY tj.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Get total count
    const [{ total }] = await executeQuery('SELECT COUNT(*) as total FROM ml_models');

    // Parse JSON fields
    const jobsWithParsedData = jobs.map(job => ({
      ...job,
      model_types: JSON.parse(job.model_types || '[]'),
      models_completed: JSON.parse(job.models_completed || '[]'),
      model_paths: JSON.parse(job.model_paths || '{}'),
      metrics: JSON.parse(job.metrics || '{}')
    }));

    res.json({
      success: true,
      message: 'Training history retrieved successfully',
      data: {
        jobs: jobsWithParsedData,
        pagination: {
          total,
          limit,
          offset,
          hasMore: (offset + limit) < total
        }
      }
    });

  } catch (error) {
    logger.error('Error getting training history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get training history'
    });
  }
});

// @route   DELETE /api/models/train/cancel/:taskId
// @desc    Cancel training job
// @access  Private (Admin only)
router.delete('/train/cancel/:taskId', async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { taskId } = req.params;

    // Check if training job exists and belongs to user
    const jobs = await executeQuery(
      'SELECT * FROM ml_models WHERE task_id = ? AND user_id = ?',
      [taskId, req.user.id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Training job not found'
      });
    }

    const job = jobs[0];

    // Check if job can be cancelled
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel job with status: ${job.status}`
      });
    }

    // Try to cancel via ML API
    try {
      await mlApiService.cancelTraining(taskId);
    } catch (mlError) {
      logger.warn(`ML API cancel failed for ${taskId}: ${mlError.message}`);
      // Continue with database update even if ML API fails
    }

    // Update database status
    await executeQuery(`
      UPDATE ml_models 
      SET status = 'cancelled', message = 'Training cancelled by user', completed_at = NOW()
      WHERE task_id = ?
    `, [taskId]);

    logger.info(`Training job ${taskId} cancelled by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Training job cancelled successfully',
      data: { task_id: taskId, status: 'cancelled' }
    });

  } catch (error) {
    logger.error('Error cancelling training:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel training job'
    });
  }
});

// @route   DELETE /api/models/train/:taskId
// @desc    Delete a training job and associated model files
// @access  Private (Admin only)
router.delete('/train/:taskId', async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { taskId } = req.params;

    // Get job details before deletion
    const jobs = await executeQuery(
      'SELECT * FROM ml_models WHERE task_id = ? AND user_id = ?',
      [taskId, req.user.id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Training job not found'
      });
    }

    const job = jobs[0];

    // Try to delete via ML API first (handles file deletion)
    try {
      await mlApiService.deleteTrainingJob(taskId);
    } catch (mlError) {
      logger.warn(`ML API delete failed for ${taskId}: ${mlError.message}`);
      // Continue with database deletion even if ML API fails
    }

    // Delete from database
    await executeQuery('DELETE FROM ml_models WHERE task_id = ?', [taskId]);

    logger.info(`Training job ${taskId} deleted by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Training job deleted successfully',
      data: { task_id: taskId }
    });

  } catch (error) {
    logger.error('Error deleting training job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete training job'
    });
  }
});

// @route   DELETE /api/models/training/:id
// @desc    Delete a training job by ID (for frontend compatibility)
// @access  Private (Admin/Super Admin only)
router.delete('/training/:id', async (req, res) => {
  try {
    // Check admin role
    if (!req.user?.role || !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Administrator role required.'
      });
    }

    const { id } = req.params;

    // Get job details before deletion
    const jobs = await executeQuery(
      'SELECT * FROM ml_models WHERE id = ?',
      [id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Training job not found'
      });
    }

    const job = jobs[0];

    // Delete the job from database
    await executeQuery('DELETE FROM ml_models WHERE id = ?', [id]);

    logger.info(`Training job ${id} deleted by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Training job deleted successfully',
      data: { id: parseInt(id) }
    });

  } catch (error) {
    logger.error('Error deleting training job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete training job'
    });
  }
});

// @route   GET /api/models/debug/results
// @desc    Debug: Get all model results with user info
// @access  Private
router.get('/debug/results', async (req, res) => {
  try {
    const allResultsQuery = `
      SELECT mr.*, u.username, u.id as user_id_check
      FROM model_results mr
      LEFT JOIN users u ON mr.user_id = u.id
      ORDER BY mr.created_at DESC
      LIMIT 20
    `;

    const userCountQuery = `
      SELECT user_id, COUNT(*) as count, u.username
      FROM model_results mr
      LEFT JOIN users u ON mr.user_id = u.id
      GROUP BY user_id, u.username
    `;

    const allResults = await executeQuery(allResultsQuery);
    const userCounts = await executeQuery(userCountQuery);

    res.json({
      success: true,
      message: `Found ${allResults.length} model results`,
      data: {
        all_results: allResults,
        results_by_user: userCounts,
        current_user_id: req.user?.id
      }
    });

  } catch (error) {
    logger.error('Error in debug results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debug results',
      error: error.message
    });
  }
});

// @route   GET /api/models/debug/all-results
// @desc    Debug: Get results for all users (temporary)
// @access  Private
router.get('/debug/all-results', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const results = await executeQuery(`
      SELECT mr.id, mr.accuracy, mr.precision_score, mr.recall_score, mr.f1_score,
             mr.execution_time, mr.created_at, mr.user_id,
             m.task_id as model_name, m.current_model as algorithm,
             d.original_name as dataset_name,
             u.username
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      JOIN users u ON mr.user_id = u.id
      ORDER BY mr.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [{ total }] = await executeQuery(
      'SELECT COUNT(*) as total FROM model_results'
    );

    res.json({
      success: true,
      message: 'All results retrieved successfully',
      data: {
        results,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching all results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all results',
      error: error.message
    });
  }
});

module.exports = router;
