import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import logging
from .ml_pipeline import MLPipelineManager

logger = logging.getLogger(__name__)

class NetworkPredictor:
    """Handles predictions using trained models"""
    
    def __init__(self):
        self.ml_manager = MLPipelineManager()
        self.loaded_models = {}
    
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
    
    def predict(self, X: pd.DataFrame, model_type: str = "random_forest") -> Dict[str, Any]:
        """Make predictions using specified model"""
        try:
            # Load model if needed
            self.load_model_if_needed(model_type)
            model = self.loaded_models[model_type]
            
            # Make predictions
            predictions = model.predict(X)
            
            # Get probabilities if available
            probabilities = None
            confidence_scores = None
            
            try:
                if hasattr(model, 'predict_proba'):
                    probabilities = model.predict_proba(X)
                    # Calculate confidence scores (max probability)
                    confidence_scores = np.max(probabilities, axis=1).tolist()
                    probabilities = probabilities.tolist()
            except Exception as e:
                logger.warning(f"Could not get probabilities for {model_type}: {e}")
            
            # Convert predictions to human-readable labels
            prediction_labels = ["Normal" if pred == 0 else "Attack" for pred in predictions]
            
            result = {
                "predictions": predictions.tolist(),
                "prediction_labels": prediction_labels,
                "model_type": model_type,
                "total_samples": len(predictions),
                "attacks_detected": int(np.sum(predictions)),
                "normal_traffic": int(len(predictions) - np.sum(predictions))
            }
            
            if probabilities is not None:
                result["probabilities"] = probabilities
            if confidence_scores is not None:
                result["confidence_scores"] = confidence_scores
            
            logger.info(f"Predictions completed using {model_type}: {result['attacks_detected']} attacks detected out of {result['total_samples']} samples")
            
            return result
            
        except Exception as e:
            logger.error(f"Error making predictions with {model_type}: {e}")
            raise
    
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
