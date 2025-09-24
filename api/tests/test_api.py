import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import numpy as np
import pandas as pd
import tempfile
import os

from main import app
from models.data_processor import DataProcessor
from models.ml_pipeline import MLPipelineManager
from utils.response_formatter import ResponseFormatter

# Test client
client = TestClient(app)

@pytest.fixture
def sample_data():
    """Create sample dataset for testing"""
    return pd.DataFrame({
        'feature1': [1, 2, 3, 4, 5],
        'feature2': [0.1, 0.2, 0.3, 0.4, 0.5],
        'feature3': [10, 20, 30, 40, 50],
        'label': [0, 0, 1, 1, 0]
    })

@pytest.fixture
def sample_csv_file(sample_data):
    """Create temporary CSV file"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        sample_data.to_csv(f.name, index=False)
        yield f.name
    os.unlink(f.name)

class TestHealthEndpoints:
    """Test health and status endpoints"""
    
    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()
    
    def test_health_endpoint(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

class TestDataProcessing:
    """Test data processing endpoints"""
    
    def test_upload_dataset_success(self, sample_csv_file):
        with open(sample_csv_file, 'rb') as f:
            response = client.post(
                "/data/upload",
                files={"file": ("test.csv", f, "text/csv")}
            )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "filename" in data["data"]
    
    def test_upload_invalid_file_format(self):
        # Test with non-CSV file
        response = client.post(
            "/data/upload",
            files={"file": ("test.txt", b"not a csv file", "text/plain")}
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "CSV" in data["message"]
    
    def test_preprocess_data(self, sample_csv_file):
        # First upload a file
        with open(sample_csv_file, 'rb') as f:
            upload_response = client.post(
                "/data/upload",
                files={"file": ("test.csv", f, "text/csv")}
            )
        
        filename = upload_response.json()["data"]["filename"]
        
        # Then preprocess it
        response = client.post(
            "/data/preprocess",
            json={"filename": filename, "preprocessing_options": {"normalize": True}}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_data_validation(self):
        # Test data validation with invalid data
        response = client.post(
            "/data/validate",
            json={"data": []}  # Empty data should be invalid
        )
        assert response.status_code == 400

class TestModelEndpoints:
    """Test ML model endpoints"""
    
    def test_list_models(self):
        response = client.get("/models/list")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "models" in data["data"]
        assert len(data["data"]["models"]) > 0
    
    def test_model_info(self):
        response = client.get("/models/info/random_forest")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "model_info" in data["data"]
    
    def test_invalid_model_info(self):
        response = client.get("/models/info/invalid_model")
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False

class TestTrainingEndpoints:
    """Test model training endpoints"""
    
    @patch('models.model_trainer.ModelTrainer.train_model')
    def test_train_model_success(self, mock_train, sample_csv_file):
        # Mock successful training
        mock_train.return_value = {
            "accuracy": 0.95,
            "f1_score": 0.92,
            "precision": 0.94,
            "recall": 0.90
        }
        
        with open(sample_csv_file, 'rb') as f:
            response = client.post(
                "/training/train",
                data={"model_type": "random_forest"},
                files={"file": ("train.csv", f, "text/csv")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "metrics" in data["data"]
    
    def test_train_without_file(self):
        response = client.post(
            "/training/train",
            data={"model_type": "random_forest"}
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
    
    def test_invalid_model_type(self, sample_csv_file):
        with open(sample_csv_file, 'rb') as f:
            response = client.post(
                "/training/train",
                data={"model_type": "invalid_model"},
                files={"file": ("train.csv", f, "text/csv")}
            )
        assert response.status_code == 400

class TestPredictionEndpoints:
    """Test prediction endpoints"""
    
    @patch('models.predictor.Predictor.predict')
    def test_predict_success(self, mock_predict, sample_csv_file):
        # Mock prediction results
        mock_predict.return_value = {
            "predictions": [0, 1, 0, 1, 0],
            "probabilities": [0.1, 0.9, 0.2, 0.8, 0.3],
            "model_used": "random_forest"
        }
        
        with open(sample_csv_file, 'rb') as f:
            response = client.post(
                "/predictions/predict",
                data={"model": "random_forest"},
                files={"file": ("predict.csv", f, "text/csv")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "predictions" in data["data"]
        assert "model_used" in data["data"]
    
    def test_predict_single_sample(self):
        sample_features = {
            "features": [1.0, 2.0, 3.0, 4.0, 5.0],
            "model": "random_forest"
        }
        
        with patch('models.predictor.Predictor.predict_single') as mock_predict:
            mock_predict.return_value = {
                "prediction": 1,
                "probability": 0.85,
                "confidence": "high"
            }
            
            response = client.post("/predictions/predict-single", json=sample_features)
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "prediction" in data["data"]
    
    def test_predict_invalid_features(self):
        invalid_features = {
            "features": [],  # Empty features
            "model": "random_forest"
        }
        
        response = client.post("/predictions/predict-single", json=invalid_features)
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False

class TestModelValidation:
    """Test ML model validation and performance"""
    
    @patch('models.ml_pipeline.MLPipelineManager.validate_model')
    def test_model_validation(self, mock_validate, sample_csv_file):
        mock_validate.return_value = {
            "accuracy": 0.92,
            "precision": 0.91,
            "recall": 0.89,
            "f1_score": 0.90,
            "confusion_matrix": [[50, 5], [3, 42]]
        }
        
        with open(sample_csv_file, 'rb') as f:
            response = client.post(
                "/models/validate",
                data={"model": "random_forest"},
                files={"file": ("validation.csv", f, "text/csv")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "accuracy" in data["data"]
        assert "confusion_matrix" in data["data"]

class TestDataValidation:
    """Test data quality and validation"""
    
    def test_data_quality_check(self, sample_data):
        # Convert dataframe to dict for JSON serialization
        data_dict = sample_data.to_dict(orient='records')
        
        response = client.post(
            "/data/quality-check",
            json={"data": data_dict}
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "quality_metrics" in result["data"]
    
    def test_detect_anomalies(self, sample_data):
        data_dict = sample_data.to_dict(orient='records')
        
        response = client.post(
            "/data/detect-anomalies",
            json={"data": data_dict}
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "anomalies" in result["data"]

class TestSecurityEndpoints:
    """Test security-related functionality"""
    
    def test_rate_limiting(self):
        # Make multiple rapid requests to test rate limiting
        responses = []
        for _ in range(10):
            response = client.get("/")
            responses.append(response)
        
        # At least some should succeed
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count > 0
    
    def test_input_sanitization(self):
        malicious_input = {
            "features": ["<script>alert('xss')</script>", "../../etc/passwd"],
            "model": "random_forest"
        }
        
        response = client.post("/predictions/predict-single", json=malicious_input)
        # Should handle malicious input gracefully
        assert response.status_code in [400, 422]  # Bad request or validation error

class TestAdvancedML:
    """Test advanced ML functionality"""
    
    @patch('models.ml_pipeline.MLPipelineManager.adversarial_test')
    def test_adversarial_robustness(self, mock_adversarial, sample_data):
        mock_adversarial.return_value = {
            "robustness_score": 0.87,
            "vulnerable_samples": 5,
            "total_samples": 100
        }
        
        data_dict = sample_data.to_dict(orient='records')
        
        response = client.post(
            "/models/adversarial-test",
            json={
                "model": "random_forest",
                "test_data": data_dict,
                "attack_types": ["fgsm", "pgd"]
            }
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "robustness_score" in result["data"]
    
    @patch('models.ml_pipeline.MLPipelineManager.explain_prediction')
    def test_model_interpretability(self, mock_explain):
        mock_explain.return_value = {
            "feature_importance": {
                "feature1": 0.4,
                "feature2": 0.3,
                "feature3": 0.3
            },
            "shap_values": [0.1, -0.2, 0.15]
        }
        
        response = client.post(
            "/models/explain",
            json={
                "model": "random_forest",
                "features": [1.0, 2.0, 3.0],
                "explanation_type": "shap"
            }
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "feature_importance" in result["data"]