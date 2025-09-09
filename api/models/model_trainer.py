import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense
from tensorflow.keras.callbacks import EarlyStopping
from typing import Dict, Any, Tuple
import logging
import joblib
from .ml_pipeline import MLPipelineManager

logger = logging.getLogger(__name__)

class ModelTrainer:
    """Handles training of all ML models"""
    
    def __init__(self):
        self.ml_manager = MLPipelineManager()
        self.trained_models = {}
    
    def train_random_forest(self, X_train, X_test, y_train, y_test, preprocessor) -> Dict[str, Any]:
        """Train Random Forest model"""
        try:
            logger.info("Training Random Forest model...")
            
            # Create pipeline
            pipeline = Pipeline(steps=[
                ("preprocessor", preprocessor),
                ("classifier", RandomForestClassifier(
                    n_estimators=100,
                    random_state=42,
                    n_jobs=-1
                ))
            ])
            
            # Train
            pipeline.fit(X_train, y_train)
            
            # Evaluate
            y_pred = pipeline.predict(X_test)
            y_pred_proba = pipeline.predict_proba(X_test)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
            
            # Get feature importance
            feature_importance = pipeline.named_steps['classifier'].feature_importances_
            feature_names = preprocessor.get_feature_names_out()
            
            performance_metrics = {
                "accuracy": float(accuracy),
                "precision": float(precision),
                "recall": float(recall),
                "f1_score": float(f1),
                "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
                "classification_report": classification_report(y_test, y_pred, output_dict=True),
                "feature_importance": dict(zip(feature_names, feature_importance.tolist()))
            }
            
            # Save model
            self.ml_manager.save_model("random_forest", pipeline, performance_metrics)
            
            logger.info(f"Random Forest trained successfully with accuracy: {accuracy:.4f}")
            return {
                "model": pipeline,
                "performance": performance_metrics,
                "predictions": y_pred.tolist(),
                "probabilities": y_pred_proba.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error training Random Forest: {e}")
            raise
    
    def train_isolation_forest(self, X_train, X_test, y_train, y_test, preprocessor) -> Dict[str, Any]:
        """Train Isolation Forest model"""
        try:
            logger.info("Training Isolation Forest model...")
            
            # Create pipeline
            pipeline = Pipeline(steps=[
                ("preprocessor", preprocessor),
                ("model", IsolationForest(
                    contamination='auto',
                    random_state=42,
                    n_jobs=-1
                ))
            ])
            
            # Train on training data
            pipeline.fit(X_train)
            
            # Predict on test data
            y_pred_raw = pipeline.predict(X_test)
            y_pred = np.where(y_pred_raw == -1, 1, 0)  # -1 (outlier) -> 1 (Attack)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
            
            performance_metrics = {
                "accuracy": float(accuracy),
                "precision": float(precision),
                "recall": float(recall),
                "f1_score": float(f1),
                "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
                "classification_report": classification_report(y_test, y_pred, output_dict=True),
                "model_type": "anomaly_detection"
            }
            
            # Save model
            self.ml_manager.save_model("isolation_forest", pipeline, performance_metrics)
            
            logger.info(f"Isolation Forest trained successfully with accuracy: {accuracy:.4f}")
            return {
                "model": pipeline,
                "performance": performance_metrics,
                "predictions": y_pred.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error training Isolation Forest: {e}")
            raise
    
    def train_one_class_svm(self, X_train, X_test, y_train, y_test, preprocessor) -> Dict[str, Any]:
        """Train One-Class SVM model"""
        try:
            logger.info("Training One-Class SVM model...")
            
            # Create pipeline
            pipeline = Pipeline(steps=[
                ("preprocessor", preprocessor),
                ("model", OneClassSVM(
                    nu=0.1,
                    kernel="rbf",
                    gamma="auto"
                ))
            ])
            
            # Train only on normal data (Class == 0)
            X_train_normal = X_train[y_train == 0]
            pipeline.fit(X_train_normal)
            
            # Predict on test data
            y_pred_raw = pipeline.predict(X_test)
            y_pred = np.where(y_pred_raw == -1, 1, 0)  # -1 (outlier) -> 1 (Attack)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
            
            performance_metrics = {
                "accuracy": float(accuracy),
                "precision": float(precision),
                "recall": float(recall),
                "f1_score": float(f1),
                "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
                "classification_report": classification_report(y_test, y_pred, output_dict=True),
                "model_type": "anomaly_detection",
                "training_samples": len(X_train_normal)
            }
            
            # Save model
            self.ml_manager.save_model("one_class_svm", pipeline, performance_metrics)
            
            logger.info(f"One-Class SVM trained successfully with accuracy: {accuracy:.4f}")
            return {
                "model": pipeline,
                "performance": performance_metrics,
                "predictions": y_pred.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error training One-Class SVM: {e}")
            raise
    
    def train_autoencoder(self, X_train, X_test, y_train, y_test, preprocessor) -> Dict[str, Any]:
        """Train Autoencoder model"""
        try:
            logger.info("Training Autoencoder model...")
            
            # Preprocess data
            X_train_preprocessed = preprocessor.fit_transform(X_train).toarray()
            X_test_preprocessed = preprocessor.transform(X_test).toarray()
            
            # Filter for normal data after preprocessing
            X_train_normal_preprocessed = X_train_preprocessed[y_train.to_numpy() == 0]
            
            # Define the Autoencoder model
            input_dim = X_train_normal_preprocessed.shape[1]
            encoding_dim = min(32, input_dim // 2)  # Adaptive encoding dimension
            
            input_layer = Input(shape=(input_dim,))
            encoder = Dense(encoding_dim, activation="relu")(input_layer)
            decoder = Dense(input_dim, activation="sigmoid")(encoder)
            
            autoencoder = Model(inputs=input_layer, outputs=decoder)
            autoencoder.compile(optimizer='adam', loss='mse')
            
            # Train the Autoencoder
            early_stopping = EarlyStopping(monitor='val_loss', patience=5, mode='min')
            
            history = autoencoder.fit(
                X_train_normal_preprocessed, X_train_normal_preprocessed,
                epochs=50,  # Reduced for faster training
                batch_size=256,
                shuffle=True,
                validation_split=0.1,
                callbacks=[early_stopping],
                verbose=0
            )
            
            # Predict reconstruction errors on test data
            reconstructions = autoencoder.predict(X_test_preprocessed, verbose=0)
            mse = np.mean(np.power(X_test_preprocessed - reconstructions, 2), axis=1)
            
            # Determine threshold for anomaly detection
            error_threshold = np.mean(mse) + 2 * np.std(mse)
            
            # Classify instances based on threshold
            y_pred = (mse > error_threshold).astype(int)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
            
            performance_metrics = {
                "accuracy": float(accuracy),
                "precision": float(precision),
                "recall": float(recall),
                "f1_score": float(f1),
                "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
                "classification_report": classification_report(y_test, y_pred, output_dict=True),
                "model_type": "anomaly_detection",
                "threshold": float(error_threshold),
                "encoding_dim": encoding_dim,
                "training_history": {
                    "final_loss": float(history.history['loss'][-1]),
                    "final_val_loss": float(history.history['val_loss'][-1])
                }
            }
            
            # Create a combined pipeline that includes preprocessor and autoencoder
            class AutoencoderPipeline:
                def __init__(self, preprocessor, autoencoder, threshold):
                    self.preprocessor = preprocessor
                    self.autoencoder = autoencoder
                    self.threshold = threshold
                
                def predict(self, X):
                    X_processed = self.preprocessor.transform(X).toarray()
                    reconstructions = self.autoencoder.predict(X_processed, verbose=0)
                    mse = np.mean(np.power(X_processed - reconstructions, 2), axis=1)
                    return (mse > self.threshold).astype(int)
                
                def predict_proba(self, X):
                    # For anomaly detection, return reconstruction error as probability
                    X_processed = self.preprocessor.transform(X).toarray()
                    reconstructions = self.autoencoder.predict(X_processed, verbose=0)
                    mse = np.mean(np.power(X_processed - reconstructions, 2), axis=1)
                    # Normalize MSE to probability-like scores
                    prob_scores = np.clip(mse / self.threshold, 0, 1)
                    return np.column_stack([1 - prob_scores, prob_scores])
            
            pipeline = AutoencoderPipeline(preprocessor, autoencoder, error_threshold)
            
            # Save model
            self.ml_manager.save_model("autoencoder", pipeline, performance_metrics)
            
            logger.info(f"Autoencoder trained successfully with accuracy: {accuracy:.4f}")
            return {
                "model": pipeline,
                "performance": performance_metrics,
                "predictions": y_pred.tolist(),
                "reconstruction_errors": mse.tolist()
            }
            
        except Exception as e:
            logger.error(f"Error training Autoencoder: {e}")
            raise
    
    def train_model(self, model_type: str, X_train, X_test, y_train, y_test, preprocessor) -> Dict[str, Any]:
        """Train a specific model type"""
        try:
            if model_type == "random_forest":
                return self.train_random_forest(X_train, X_test, y_train, y_test, preprocessor)
            elif model_type == "isolation_forest":
                return self.train_isolation_forest(X_train, X_test, y_train, y_test, preprocessor)
            elif model_type == "one_class_svm":
                return self.train_one_class_svm(X_train, X_test, y_train, y_test, preprocessor)
            elif model_type == "autoencoder":
                return self.train_autoencoder(X_train, X_test, y_train, y_test, preprocessor)
            else:
                raise ValueError(f"Unknown model type: {model_type}")
                
        except Exception as e:
            logger.error(f"Error training model {model_type}: {e}")
            raise
    
    def train_all_models(self, X_train, X_test, y_train, y_test, preprocessor) -> Dict[str, Any]:
        """Train all available models"""
        model_types = ["random_forest", "isolation_forest", "one_class_svm", "autoencoder"]
        results = {}
        
        for model_type in model_types:
            try:
                logger.info(f"Training {model_type}...")
                result = self.train_model(model_type, X_train, X_test, y_train, y_test, preprocessor)
                results[model_type] = result
                logger.info(f"{model_type} training completed successfully")
            except Exception as e:
                logger.error(f"Failed to train {model_type}: {e}")
                results[model_type] = {"error": str(e)}
        
        return results
