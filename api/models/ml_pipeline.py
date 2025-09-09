import os
import joblib
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class MLPipelineManager:
    """Manages ML models, pipelines, and their metadata"""
    
    def __init__(self, models_dir: str = "saved_models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        self.metadata_file = self.models_dir / "models_metadata.json"
        self.load_metadata()
    
    def load_metadata(self):
        """Load models metadata"""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, 'r') as f:
                    self.metadata = json.load(f)
            else:
                self.metadata = {}
        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            self.metadata = {}
    
    def save_metadata(self):
        """Save models metadata"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")
    
    def save_model(self, model_name: str, pipeline, performance_metrics: Dict):
        """Save a trained model with metadata"""
        try:
            model_path = self.models_dir / f"{model_name}.pkl"
            
            # Save the pipeline
            joblib.dump(pipeline, model_path)
            
            # Update metadata
            self.metadata[model_name] = {
                "path": str(model_path),
                "created_at": datetime.now().isoformat(),
                "performance": performance_metrics,
                "size_mb": round(model_path.stat().st_size / (1024 * 1024), 2)
            }
            
            self.save_metadata()
            logger.info(f"Model {model_name} saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving model {model_name}: {e}")
            raise
    
    def load_model(self, model_name: str):
        """Load a trained model"""
        try:
            if model_name not in self.metadata:
                raise ValueError(f"Model {model_name} not found")
            
            model_path = self.metadata[model_name]["path"]
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            return joblib.load(model_path)
            
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            raise
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models with their info"""
        models = []
        for model_name, info in self.metadata.items():
            models.append({
                "name": model_name,
                "created_at": info["created_at"],
                "performance": info["performance"],
                "size_mb": info["size_mb"]
            })
        return models
    
    def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific model"""
        if model_name not in self.metadata:
            raise ValueError(f"Model {model_name} not found")
        
        return self.metadata[model_name]
    
    def get_model_performance(self, model_name: str) -> Dict[str, Any]:
        """Get performance metrics for a specific model"""
        if model_name not in self.metadata:
            raise ValueError(f"Model {model_name} not found")
        
        return self.metadata[model_name]["performance"]
    
    def delete_model(self, model_name: str):
        """Delete a model and its metadata"""
        try:
            if model_name not in self.metadata:
                raise ValueError(f"Model {model_name} not found")
            
            # Delete model file
            model_path = self.metadata[model_name]["path"]
            if os.path.exists(model_path):
                os.remove(model_path)
            
            # Remove from metadata
            del self.metadata[model_name]
            self.save_metadata()
            
            logger.info(f"Model {model_name} deleted successfully")
            
        except Exception as e:
            logger.error(f"Error deleting model {model_name}: {e}")
            raise
    
    def model_exists(self, model_name: str) -> bool:
        """Check if a model exists"""
        return model_name in self.metadata
