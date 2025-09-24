import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os
import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.data_processor import DataProcessor
from models.ml_pipeline import MLPipelineManager
from models.model_trainer import ModelTrainer
from models.predictor import Predictor

class TestDataProcessor:
    """Test data processing functionality"""
    
    @pytest.fixture
    def processor(self):
        return DataProcessor()
    
    @pytest.fixture
    def sample_data(self):
        return pd.DataFrame({
            'feature1': [1, 2, 3, 4, 5, np.nan],
            'feature2': [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
            'feature3': [10, 20, 30, 40, 50, 60],
            'label': [0, 0, 1, 1, 0, 1]
        })
    
    def test_load_data_csv(self, processor, sample_data):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            sample_data.to_csv(f.name, index=False)
            
            loaded_data = processor.load_data(f.name)
            assert isinstance(loaded_data, pd.DataFrame)
            assert len(loaded_data) == len(sample_data)
            
        os.unlink(f.name)
    
    def test_handle_missing_values(self, processor, sample_data):
        processed_data = processor.handle_missing_values(sample_data)
        assert processed_data.isnull().sum().sum() == 0  # No missing values
    
    def test_normalize_features(self, processor, sample_data):
        normalized_data = processor.normalize_features(sample_data)
        # Check if features are normalized (mean ~0, std ~1)
        numeric_cols = normalized_data.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col != 'label':  # Exclude target variable
                assert abs(normalized_data[col].mean()) < 0.1
                assert abs(normalized_data[col].std() - 1) < 0.1
    
    def test_detect_outliers(self, processor, sample_data):
        outliers = processor.detect_outliers(sample_data)
        assert isinstance(outliers, np.ndarray)
        assert len(outliers) == len(sample_data)
    
    def test_feature_selection(self, processor, sample_data):
        selected_features = processor.feature_selection(sample_data, target_col='label')
        assert isinstance(selected_features, list)
        assert len(selected_features) > 0

class TestMLPipeline:
    """Test ML pipeline functionality"""
    
    @pytest.fixture
    def pipeline(self):
        return MLPipelineManager()
    
    @pytest.fixture
    def sample_features(self):
        return np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]])
    
    @pytest.fixture
    def sample_labels(self):
        return np.array([0, 1, 0, 1])
    
    def test_train_random_forest(self, pipeline, sample_features, sample_labels):
        model = pipeline.train_random_forest(sample_features, sample_labels)
        assert model is not None
        
        # Test prediction
        predictions = model.predict(sample_features)
        assert len(predictions) == len(sample_features)
    
    def test_train_isolation_forest(self, pipeline, sample_features):
        model = pipeline.train_isolation_forest(sample_features)
        assert model is not None
        
        predictions = model.predict(sample_features)
        assert len(predictions) == len(sample_features)
    
    def test_train_svm(self, pipeline, sample_features, sample_labels):
        model = pipeline.train_svm(sample_features, sample_labels)
        assert model is not None
        
        predictions = model.predict(sample_features)
        assert len(predictions) == len(sample_features)
    
    @patch('tensorflow.keras.models.Sequential')
    def test_train_autoencoder(self, mock_sequential, pipeline, sample_features):
        mock_model = MagicMock()
        mock_sequential.return_value = mock_model
        
        model = pipeline.train_autoencoder(sample_features)
        assert model is not None
    
    def test_evaluate_model(self, pipeline, sample_features, sample_labels):
        from sklearn.ensemble import RandomForestClassifier
        
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        model.fit(sample_features, sample_labels)
        
        metrics = pipeline.evaluate_model(model, sample_features, sample_labels)
        assert 'accuracy' in metrics
        assert 'precision' in metrics
        assert 'recall' in metrics
        assert 'f1_score' in metrics
    
    def test_cross_validation(self, pipeline, sample_features, sample_labels):
        from sklearn.ensemble import RandomForestClassifier
        
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        cv_scores = pipeline.cross_validate(model, sample_features, sample_labels)
        
        assert isinstance(cv_scores, dict)
        assert 'mean_accuracy' in cv_scores
        assert 'std_accuracy' in cv_scores

class TestModelTrainer:
    """Test model training functionality"""
    
    @pytest.fixture
    def trainer(self):
        return ModelTrainer()
    
    def test_train_model_random_forest(self, trainer):
        X = np.random.rand(100, 5)
        y = np.random.randint(0, 2, 100)
        
        result = trainer.train_model('random_forest', X, y)
        assert 'model' in result
        assert 'metrics' in result
        assert 'training_time' in result
    
    def test_train_model_isolation_forest(self, trainer):
        X = np.random.rand(100, 5)
        
        result = trainer.train_model('isolation_forest', X)
        assert 'model' in result
        assert 'training_time' in result
    
    def test_hyperparameter_tuning(self, trainer):
        X = np.random.rand(50, 3)  # Smaller dataset for faster testing
        y = np.random.randint(0, 2, 50)
        
        best_params = trainer.hyperparameter_tuning('random_forest', X, y)
        assert isinstance(best_params, dict)
        assert len(best_params) > 0
    
    def test_save_load_model(self, trainer):
        X = np.random.rand(20, 3)
        y = np.random.randint(0, 2, 20)
        
        result = trainer.train_model('random_forest', X, y)
        model = result['model']
        
        # Save model
        with tempfile.NamedTemporaryFile(delete=False) as f:
            trainer.save_model(model, f.name)
            
            # Load model
            loaded_model = trainer.load_model(f.name)
            assert loaded_model is not None
            
        os.unlink(f.name)

class TestPredictor:
    """Test prediction functionality"""
    
    @pytest.fixture
    def predictor(self):
        return Predictor()
    
    @pytest.fixture
    def trained_model(self):
        from sklearn.ensemble import RandomForestClassifier
        X = np.random.rand(100, 5)
        y = np.random.randint(0, 2, 100)
        
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        model.fit(X, y)
        return model
    
    def test_predict_single(self, predictor, trained_model):
        features = np.array([1, 2, 3, 4, 5])
        
        with patch('models.predictor.Predictor.load_model', return_value=trained_model):
            result = predictor.predict_single(features, 'random_forest')
            
            assert 'prediction' in result
            assert 'probability' in result
            assert result['prediction'] in [0, 1]
    
    def test_predict_batch(self, predictor, trained_model):
        features = np.random.rand(10, 5)
        
        with patch('models.predictor.Predictor.load_model', return_value=trained_model):
            result = predictor.predict_batch(features, 'random_forest')
            
            assert 'predictions' in result
            assert 'probabilities' in result
            assert len(result['predictions']) == len(features)
    

    
    def test_confidence_calculation(self, predictor):
        probabilities = np.array([0.9, 0.1, 0.7, 0.3, 0.95])
        confidences = predictor.calculate_confidence(probabilities)
        
        assert len(confidences) == len(probabilities)
        assert all(conf in ['low', 'medium', 'high'] for conf in confidences)

class TestDataQuality:
    """Test data quality checks"""
    
    def test_check_data_quality(self):
        # Test with good quality data
        good_data = pd.DataFrame({
            'feature1': np.random.normal(0, 1, 100),
            'feature2': np.random.normal(0, 1, 100),
            'label': np.random.randint(0, 2, 100)
        })
        
        processor = DataProcessor()
        quality_metrics = processor.check_data_quality(good_data)
        
        assert 'missing_percentage' in quality_metrics
        assert 'duplicate_percentage' in quality_metrics
        assert 'data_types' in quality_metrics
    
    def test_detect_data_drift(self):
        # Create reference and current datasets
        reference_data = pd.DataFrame({
            'feature1': np.random.normal(0, 1, 100),
            'feature2': np.random.normal(0, 1, 100)
        })
        
        # Current data with slight drift
        current_data = pd.DataFrame({
            'feature1': np.random.normal(0.5, 1, 100),  # Mean shifted
            'feature2': np.random.normal(0, 1.5, 100)   # Variance increased
        })
        
        processor = DataProcessor()
        drift_results = processor.detect_data_drift(reference_data, current_data)
        
        assert 'drift_detected' in drift_results
        assert 'drift_scores' in drift_results

class TestPropertyBasedTesting:
    """Property-based testing using hypothesis"""
    


# Load testing and stress testing
class TestPerformance:
    """Test performance and scalability"""
    
    def test_large_dataset_processing(self):
        # Test with larger dataset
        large_data = pd.DataFrame(np.random.rand(10000, 20))
        processor = DataProcessor()
        
        import time
        start_time = time.time()
        processed_data = processor.normalize_features(large_data)
        processing_time = time.time() - start_time
        
        assert processing_time < 10  # Should process within 10 seconds
        assert len(processed_data) == len(large_data)
    
    def test_model_prediction_speed(self):
        from sklearn.ensemble import RandomForestClassifier
        
        # Train a model
        X_train = np.random.rand(1000, 10)
        y_train = np.random.randint(0, 2, 1000)
        model = RandomForestClassifier(n_estimators=50)
        model.fit(X_train, y_train)
        
        # Test prediction speed
        X_test = np.random.rand(1000, 10)
        
        import time
        start_time = time.time()
        predictions = model.predict(X_test)
        prediction_time = time.time() - start_time
        
        assert prediction_time < 5  # Should predict within 5 seconds
        assert len(predictions) == len(X_test)