import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
from typing import Dict, List, Any, Optional
import logging
import joblib
import os
from .ml_pipeline import MLPipelineManager

logger = logging.getLogger(__name__)

class NetworkPredictor:
    """Handles predictions using trained models with integrated preprocessing"""
    
    def __init__(self):
        self.ml_manager = MLPipelineManager()
        self.loaded_models = {}
        self.models_dir = "api/saved_models"
    
    def load_model_if_needed(self, model_type: str):
        """Load model if not already loaded"""
        if model_type not in self.loaded_models:
            try:
                model = self.ml_manager.load_model(model_type)
                self.loaded_models[model_type] = model
                logger.info(f"Model {model_type} loaded successfully")
            except Exception as e:
                logger.error(f"Error loading model {model_type}: {e}")
                raise
    
    def predict_with_pipeline(self, df: pd.DataFrame, model_name: str) -> Dict[str, Any]:
        """
        Make predictions using the complete pipeline (preprocessing + model)
        This is the main method to use for predictions with the new pipeline approach
        """
        try:
            # Check if model exists
            model_path = os.path.join(self.models_dir, f"{model_name}.pkl")
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model {model_name} not found at {model_path}")
            
            # Load the complete pipeline
            pipeline = joblib.load(model_path)
            logger.info(f"Loaded complete pipeline for {model_name}")
            
            # Prepare features (remove label if present)
            if "label" in df.columns:
                X = df.drop(columns=["label"])
                y_true = df["label"]
                has_labels = True
            else:
                X = df.copy()
                y_true = None
                has_labels = False
            
            # Make predictions (pipeline handles preprocessing automatically)
            logger.info("Making predictions...")
            
            # Get raw predictions
            y_pred_raw = pipeline.predict(X)
            
            # Handle different model types
            model_info = self.ml_manager.get_model_info(model_name)
            model_type = model_info.get("performance", {}).get("model_type", "supervised")
            
            if model_type == "anomaly_detection":
                # Convert -1 (outlier) to 1 (Attack), 1 (normal) to 0 (Normal)
                y_pred = np.where(y_pred_raw == -1, 1, 0)
            else:
                # Supervised learning - predictions are already in correct format
                y_pred = y_pred_raw
            
            # Get probabilities if available
            probabilities = None
            confidence_scores = None
            
            try:
                if hasattr(pipeline, 'predict_proba'):
                    probabilities = pipeline.predict_proba(X)
                    # Calculate confidence scores (max probability)
                    confidence_scores = np.max(probabilities, axis=1).tolist()
                    probabilities = probabilities.tolist()
                elif model_type == "anomaly_detection":
                    # For anomaly detection, use decision function as pseudo-probabilities
                    if hasattr(pipeline, 'decision_function'):
                        scores = pipeline.decision_function(X)
                        # Normalize scores to [0, 1] range
                        normalized_scores = (scores - scores.min()) / (scores.max() - scores.min())
                        # Create probability-like scores
                        prob_anomaly = 1 - normalized_scores  # Higher score = more likely to be anomaly
                        probabilities = [[1-p, p] for p in prob_anomaly]
                        confidence_scores = [max(p) for p in probabilities]
            except Exception as e:
                logger.warning(f"Could not get probabilities for {model_name}: {e}")
            
            # Convert predictions to human-readable labels
            prediction_labels = ["Normal" if pred == 0 else "Attack" for pred in y_pred]
            
            # Basic results
            results = {
                "model_name": model_name,
                "predictions": y_pred.tolist(),
                "prediction_labels": prediction_labels,
                "total_samples": len(y_pred),
                "attacks_detected": int(np.sum(y_pred)),
                "normal_traffic": int(len(y_pred) - np.sum(y_pred)),
                "attack_percentage": round((np.sum(y_pred) / len(y_pred)) * 100, 2)
            }
            
            # Add probabilities if available
            if probabilities is not None:
                results["probabilities"] = probabilities
            if confidence_scores is not None:
                results["confidence_scores"] = confidence_scores
            
            # Calculate performance metrics if true labels are available
            if has_labels and y_true is not None:
                accuracy = accuracy_score(y_true, y_pred)
                precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
                
                performance = {
                    "accuracy": round(float(accuracy), 4),
                    "precision": round(float(precision), 4),
                    "recall": round(float(recall), 4),
                    "f1_score": round(float(f1), 4),
                    "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
                    "classification_report": classification_report(y_true, y_pred, output_dict=True)
                }
                
                results["performance"] = performance
                logger.info(f"Test performance - Accuracy: {accuracy:.4f}, F1: {f1:.4f}")
            
            logger.info(f"Predictions completed: {results['attacks_detected']} attacks detected out of {results['total_samples']} samples")
            
            return results
            
        except Exception as e:
            logger.error(f"Error making predictions with {model_name}: {e}")
            raise
    
    def test_model(self, df: pd.DataFrame, model_name: str) -> Dict[str, Any]:
        """
        Test a model and return performance metrics
        This method expects the dataframe to have a 'label' column for evaluation
        """
        try:
            if "label" not in df.columns:
                raise ValueError("Dataset must contain a 'label' column for testing")
            
            results = self.predict_with_pipeline(df, model_name)
            
            if "performance" not in results:
                raise ValueError("Could not calculate performance metrics - missing true labels")
            
            # Add risk assessment
            attack_percentage = results["attack_percentage"]
            risk_level = self._assess_risk_level(attack_percentage)
            results["risk_assessment"] = {
                "risk_level": risk_level,
                "attack_percentage": attack_percentage
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Error testing model {model_name}: {e}")
            raise

    def _assess_risk_level(self, attack_percentage: float) -> str:
        """Assess risk level based on attack percentage"""
        if attack_percentage >= 50:
            return "Critical"
        elif attack_percentage >= 25:
            return "High"
        elif attack_percentage >= 10:
            return "Medium"
        elif attack_percentage >= 5:
            return "Low"
        else:
            return "Minimal"
    
    def predict_batch(self, X: pd.DataFrame, model_type: str = "random_forest") -> Dict[str, Any]:
        """Make batch predictions and return detailed results"""
        try:
            # Get basic predictions
            result = self.predict(X, model_type)
            
            # Add additional batch-specific information
            predictions = np.array(result["predictions"])
            
            # Calculate statistics
            attack_indices = np.where(predictions == 1)[0].tolist()
            normal_indices = np.where(predictions == 0)[0].tolist()
            
            # Risk assessment
            attack_percentage = (len(attack_indices) / len(predictions)) * 100
            risk_level = self._assess_risk_level(attack_percentage)
            
            batch_result = {
                **result,
                "attack_indices": attack_indices,
                "normal_indices": normal_indices,
                "attack_percentage": round(attack_percentage, 2),
                "risk_level": risk_level,
                "batch_summary": {
                    "total_samples": len(predictions),
                    "attacks_detected": len(attack_indices),
                    "normal_traffic": len(normal_indices),
                    "attack_rate": f"{attack_percentage:.2f}%"
                }
            }
            
            return batch_result
            
        except Exception as e:
            logger.error(f"Error in batch prediction: {e}")
            raise
    
    def predict_with_multiple_models(self, X: pd.DataFrame, model_types: List[str] = None) -> Dict[str, Any]:
        """Make predictions using multiple models and combine results"""
        try:
            if model_types is None:
                model_types = ["random_forest", "isolation_forest", "one_class_svm", "autoencoder"]
            
            results = {}
            all_predictions = []
            
            # Get predictions from each model
            for model_type in model_types:
                try:
                    if self.ml_manager.model_exists(model_type):
                        prediction_result = self.predict(X, model_type)
                        results[model_type] = prediction_result
                        all_predictions.append(np.array(prediction_result["predictions"]))
                    else:
                        logger.warning(f"Model {model_type} not available, skipping")
                except Exception as e:
                    logger.error(f"Error with model {model_type}: {e}")
                    results[model_type] = {"error": str(e)}
            
            if not all_predictions:
                raise ValueError("No models available for prediction")
            
            # Ensemble prediction (majority voting)
            predictions_array = np.array(all_predictions)
            ensemble_predictions = np.round(np.mean(predictions_array, axis=0)).astype(int)
            
            # Calculate consensus score (agreement percentage)
            consensus_scores = []
            for i in range(len(ensemble_predictions)):
                votes_for_prediction = np.sum(predictions_array[:, i] == ensemble_predictions[i])
                consensus_scores.append(votes_for_prediction / len(model_types))
            
            ensemble_result = {
                "ensemble_predictions": ensemble_predictions.tolist(),
                "consensus_scores": consensus_scores,
                "individual_models": results,
                "models_used": list(results.keys()),
                "ensemble_summary": {
                    "total_samples": len(ensemble_predictions),
                    "attacks_detected": int(np.sum(ensemble_predictions)),
                    "normal_traffic": int(len(ensemble_predictions) - np.sum(ensemble_predictions)),
                    "average_consensus": float(np.mean(consensus_scores))
                }
            }
            
            return ensemble_result
            
        except Exception as e:
            logger.error(f"Error in multi-model prediction: {e}")
            raise
    
    def predict_realtime(self, network_data: Dict[str, Any], model_type: str = "random_forest") -> Dict[str, Any]:
        """Make real-time prediction on single network record"""
        try:
            # Convert to DataFrame
            df = pd.DataFrame([network_data])
            
            # Make prediction
            result = self.predict(df, model_type)
            
            # Extract single prediction
            single_result = {
                "prediction": result["predictions"][0],
                "prediction_label": result["prediction_labels"][0],
                "is_attack": bool(result["predictions"][0]),
                "model_type": model_type,
                "timestamp": pd.Timestamp.now().isoformat()
            }
            
            # Add confidence if available
            if "confidence_scores" in result:
                single_result["confidence"] = result["confidence_scores"][0]
            
            if "probabilities" in result:
                single_result["probability_normal"] = result["probabilities"][0][0]
                single_result["probability_attack"] = result["probabilities"][0][1]
            
            return single_result
            
        except Exception as e:
            logger.error(f"Error in real-time prediction: {e}")
            raise
    
    def _assess_risk_level(self, attack_percentage: float) -> str:
        """Assess risk level based on attack percentage"""
        if attack_percentage >= 50:
            return "CRITICAL"
        elif attack_percentage >= 20:
            return "HIGH"
        elif attack_percentage >= 5:
            return "MEDIUM"
        elif attack_percentage > 0:
            return "LOW"
        else:
            return "MINIMAL"
    
    def get_model_capabilities(self, model_type: str) -> Dict[str, Any]:
        """Get capabilities and information about a specific model"""
        try:
            if not self.ml_manager.model_exists(model_type):
                raise ValueError(f"Model {model_type} not found")
            
            model_info = self.ml_manager.get_model_info(model_type)
            performance = self.ml_manager.get_model_performance(model_type)
            
            capabilities = {
                "model_type": model_type,
                "can_predict": True,
                "can_predict_proba": model_type in ["random_forest"],  # Only RF has proper probabilities
                "model_category": "supervised" if model_type == "random_forest" else "anomaly_detection",
                "performance_metrics": performance,
                "model_info": model_info,
                "recommended_use_cases": self._get_use_cases(model_type)
            }
            
            return capabilities
            
        except Exception as e:
            logger.error(f"Error getting model capabilities: {e}")
            raise
    
    def _get_use_cases(self, model_type: str) -> List[str]:
        """Get recommended use cases for each model type"""
        use_cases = {
            "random_forest": [
                "General purpose intrusion detection",
                "High accuracy requirements",
                "Feature importance analysis",
                "Balanced datasets"
            ],
            "isolation_forest": [
                "Anomaly detection",
                "Unknown attack patterns",
                "Unsupervised learning scenarios",
                "Outlier detection"
            ],
            "one_class_svm": [
                "Novelty detection",
                "When only normal traffic is available for training",
                "Zero-day attack detection",
                "Real-time monitoring"
            ],
            "autoencoder": [
                "Complex pattern recognition",
                "Deep anomaly detection",
                "Feature reconstruction analysis",
                "Advanced threat detection"
            ]
        }
        
        return use_cases.get(model_type, ["General intrusion detection"])
