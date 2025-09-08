const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { executeQuery } = require('../config/database');
const { logger } = require('../utils/logger');

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

    let query = `
      SELECT m.id, m.name, m.description, m.model_type, m.algorithm, 
             m.accuracy, m.precision_score, m.recall_score, m.f1_score, 
             m.status, m.created_at, u.username as created_by
      FROM ml_models m
      JOIN users u ON m.created_by = u.id
    `;
    let params = [];

    if (status) {
      query += ' WHERE m.status = ?';
      params.push(status);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const models = await executeQuery(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM ml_models';
    let countParams = [];
    if (status) {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }
    
    const [{ total }] = await executeQuery(countQuery, countParams);

    res.json({
      success: true,
      message: 'Models retrieved successfully',
      data: {
        models,
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

// @route   GET /api/models/results
// @desc    Get user's prediction results
// @access  Private
router.get('/results', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const results = await executeQuery(`
      SELECT mr.id, mr.accuracy, mr.precision_score, mr.recall_score, mr.f1_score,
             mr.execution_time, mr.created_at,
             m.name as model_name, m.algorithm,
             d.original_name as dataset_name
      FROM model_results mr
      JOIN ml_models m ON mr.model_id = m.id
      JOIN dataset_uploads d ON mr.dataset_id = d.id
      WHERE mr.user_id = ?
      ORDER BY mr.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, limit, offset]);

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

module.exports = router;
