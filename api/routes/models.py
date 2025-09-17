from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
import logging
import os
from pathlib import Path
from models.ml_pipeline import MLPipelineManager
from models.predictor import NetworkPredictor
from utils.response_formatter import ResponseFormatter
from config import Config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["models"])

# Initialize components
ml_manager = MLPipelineManager()
predictor = NetworkPredictor()
response_formatter = ResponseFormatter()

# Use config-based models directory with proper path resolution
MODELS_DIR = Config.MODELS_DIR

@router.get("/models/available")
async def get_available_models():
    """Get list of available trained models for testing"""
    try:
        # Resolve the models directory path relative to the api directory
        api_dir = Path(__file__).parent.parent  # Go up to api directory
        models_path = api_dir / MODELS_DIR
        
        logger.info(f"Looking for models in: {models_path.absolute()}")
        
        if not models_path.exists():
            logger.warning(f"Models directory not found at: {models_path.absolute()}")
            return {"models": [], "message": f"No models directory found at {models_path}"}
        
        # Read models from metadata file instead of just looking at .pkl files
        metadata_file = models_path / "models_metadata.json"
        if metadata_file.exists():
            import json
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            models = list(metadata.keys())
            logger.info(f"Found {len(models)} models in metadata: {models}")
        else:
            # Fallback to file-based detection for both .pkl and .keras files
            pkl_files = list(models_path.glob("*.pkl"))
            keras_files = list(models_path.glob("*.keras"))
            
            pkl_models = [f.stem for f in pkl_files 
                         if f.stem != "models_metadata" 
                         and not f.stem.endswith("_preprocessor")
                         and not f.stem.endswith("_metadata")]
            
            # For keras files, extract model name from pattern like "autoencoder_autoencoder.keras"
            keras_models = []
            for f in keras_files:
                parts = f.stem.split('_')
                if len(parts) >= 2 and parts[0] == parts[1]:  # autoencoder_autoencoder pattern
                    keras_models.append(parts[0])
            
            models = list(set(pkl_models + keras_models))
            logger.info(f"Found {len(models)} models from files: {models}")
        
        return {
            "success": True,
            "models": models,
            "total": len(models),
            "message": f"Found {len(models)} available models",
            "models_path": str(models_path.absolute())
        }
        
    except Exception as e:
        logger.error(f"Error getting available models: {e}")
        return {
            "success": False,
            "error": str(e),
            "models": []
        }

@router.get("/models")
async def list_models():
    """List all available trained models"""
    try:
        models = ml_manager.get_available_models()
        return response_formatter.success_response(
            data={"models": models, "total_models": len(models)},
            message="Available models retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/{model_name}")
async def get_model_details(model_name: str):
    """Get detailed information about a specific model"""
    try:
        if not ml_manager.model_exists(model_name):
            raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
        
        model_info = ml_manager.get_model_info(model_name)
        capabilities = predictor.get_model_capabilities(model_name)
        
        return response_formatter.model_info_response(
            model_name=model_name,
            info=model_info,
            performance=capabilities
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting model details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/{model_name}/performance")
async def get_model_performance(model_name: str):
    """Get performance metrics for a specific model"""
    try:
        if not ml_manager.model_exists(model_name):
            raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
        
        performance = ml_manager.get_model_performance(model_name)
        return response_formatter.success_response(
            data=performance,
            message=f"Performance metrics for {model_name} retrieved successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting model performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/models/{model_name}")
async def delete_model(model_name: str):
    """Delete a trained model"""
    try:
        if not ml_manager.model_exists(model_name):
            raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
        
        ml_manager.delete_model(model_name)
        return response_formatter.success_response(
            data={"deleted_model": model_name},
            message=f"Model '{model_name}' deleted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/compare")
async def compare_models(model_names: List[str] = Query(..., description="List of model names to compare")):
    """Compare performance of multiple models"""
    try:
        if not model_names:
            raise HTTPException(status_code=400, detail="At least one model name is required")
        
        comparison_data = {}
        for model_name in model_names:
            if not ml_manager.model_exists(model_name):
                comparison_data[model_name] = {"error": f"Model '{model_name}' not found"}
                continue
            
            try:
                performance = ml_manager.get_model_performance(model_name)
                model_info = ml_manager.get_model_info(model_name)
                
                comparison_data[model_name] = {
                    "performance": performance,
                    "created_at": model_info.get("created_at"),
                    "size_mb": model_info.get("size_mb")
                }
            except Exception as e:
                comparison_data[model_name] = {"error": str(e)}
        
        # Generate comparison summary
        valid_models = [name for name, data in comparison_data.items() if "error" not in data]
        summary = {}
        
        if valid_models:
            # Find best performing model by accuracy
            best_accuracy = max(
                comparison_data[name]["performance"].get("accuracy", 0) 
                for name in valid_models
            )
            best_model = next(
                name for name in valid_models 
                if comparison_data[name]["performance"].get("accuracy", 0) == best_accuracy
            )
            
            summary = {
                "best_model_by_accuracy": best_model,
                "best_accuracy": best_accuracy,
                "valid_models": len(valid_models),
                "total_compared": len(model_names)
            }
        
        return response_formatter.success_response(
            data={
                "comparison": comparison_data,
                "summary": summary
            },
            message="Model comparison completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/recommendations")
async def get_model_recommendations(
    use_case: Optional[str] = Query(None, description="Specific use case (e.g., 'real_time', 'batch', 'high_accuracy')"),
    dataset_size: Optional[str] = Query(None, description="Dataset size category ('small', 'medium', 'large')")
):
    """Get model recommendations based on use case and requirements"""
    try:
        available_models = ml_manager.get_available_models()
        
        if not available_models:
            return response_formatter.success_response(
                data={"recommendations": [], "message": "No trained models available"},
                message="No models available for recommendations"
            )
        
        recommendations = []
        
        for model in available_models:
            model_name = model["name"]
            performance = model["performance"]
            
            # Calculate recommendation score based on various factors
            score = 0
            reasons = []
            
            # Base score from accuracy
            accuracy = performance.get("accuracy", 0)
            score += accuracy * 100
            
            # Use case specific recommendations
            if use_case:
                if use_case.lower() == "real_time" and model_name in ["isolation_forest", "one_class_svm"]:
                    score += 20
                    reasons.append("Suitable for real-time detection")
                elif use_case.lower() == "high_accuracy" and model_name == "random_forest":
                    score += 25
                    reasons.append("High accuracy model")
                elif use_case.lower() == "anomaly_detection" and model_name in ["autoencoder", "isolation_forest"]:
                    score += 30
                    reasons.append("Specialized in anomaly detection")
            
            # Dataset size considerations
            if dataset_size:
                if dataset_size.lower() == "large" and model_name in ["random_forest", "autoencoder"]:
                    score += 15
                    reasons.append("Handles large datasets well")
                elif dataset_size.lower() == "small" and model_name in ["one_class_svm", "isolation_forest"]:
                    score += 10
                    reasons.append("Works well with smaller datasets")
            
            # F1-score consideration
            f1_score = performance.get("f1_score", 0)
            score += f1_score * 10
            
            recommendations.append({
                "model_name": model_name,
                "recommendation_score": round(score, 2),
                "reasons": reasons,
                "performance": performance,
                "model_info": {
                    "created_at": model["created_at"],
                    "size_mb": model["size_mb"]
                }
            })
        
        # Sort by recommendation score
        recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
        
        return response_formatter.success_response(
            data={
                "recommendations": recommendations,
                "criteria": {
                    "use_case": use_case,
                    "dataset_size": dataset_size
                },
                "top_recommendation": recommendations[0] if recommendations else None
            },
            message="Model recommendations generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))
