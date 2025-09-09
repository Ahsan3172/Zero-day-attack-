from fastapi import APIRouter, HTTPException, BackgroundTasks, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from models.model_trainer import ModelTrainer
from models.data_processor import DataProcessor
from utils.response_formatter import ResponseFormatter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["training"])

# Initialize components
model_trainer = ModelTrainer()
data_processor = DataProcessor()
response_formatter = ResponseFormatter()

# Global variable for training status tracking
training_tasks = {}

class TrainingRequest(BaseModel):
    dataset_path: Optional[str] = None
    model_types: List[str] = ["random_forest", "isolation_forest", "one_class_svm", "autoencoder"]
    test_size: float = 0.2
    random_state: int = 42
    outlier_method: str = "iqr_cap"

class TrainingStatus(BaseModel):
    task_id: str
    status: str  # 'started', 'in_progress', 'completed', 'failed'
    progress: float
    message: str
    models_completed: List[str]
    current_model: Optional[str] = None
    error_details: Optional[str] = None

@router.post("/train")
async def start_training(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start model training in background"""
    try:
        # Validate model types
        valid_models = ["random_forest", "isolation_forest", "one_class_svm", "autoencoder"]
        invalid_models = [m for m in request.model_types if m not in valid_models]
        if invalid_models:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model types: {invalid_models}. Valid options: {valid_models}"
            )
        
        # Generate unique task ID
        from datetime import datetime
        task_id = f"training_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Initialize training status
        training_tasks[task_id] = TrainingStatus(
            task_id=task_id,
            status="started",
            progress=0.0,
            message="Training job initialized",
            models_completed=[]
        )
        
        # Add background task
        background_tasks.add_task(
            train_models_background,
            task_id,
            request
        )
        
        return response_formatter.training_response(
            task_id=task_id,
            status="started",
            message="Training started in background"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/train/status/{task_id}")
async def get_training_status(task_id: str):
    """Get training status for a specific task"""
    try:
        if task_id not in training_tasks:
            raise HTTPException(status_code=404, detail="Training task not found")
        
        status = training_tasks[task_id]
        return response_formatter.success_response(
            data=status.dict(),
            message="Training status retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting training status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/train/active")
async def get_active_training_tasks():
    """Get all active training tasks"""
    try:
        active_tasks = {
            task_id: status.dict() 
            for task_id, status in training_tasks.items()
            if status.status in ["started", "in_progress"]
        }
        
        return response_formatter.success_response(
            data={
                "active_tasks": active_tasks,
                "total_active": len(active_tasks)
            },
            message="Active training tasks retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting active tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/train/history")
async def get_training_history(limit: int = 10):
    """Get training history"""
    try:
        # Get recent training tasks
        sorted_tasks = sorted(
            training_tasks.items(),
            key=lambda x: x[0],  # Sort by task_id (which includes timestamp)
            reverse=True
        )
        
        recent_tasks = dict(sorted_tasks[:limit])
        
        # Calculate summary statistics
        completed_count = sum(1 for status in recent_tasks.values() if status.status == "completed")
        failed_count = sum(1 for status in recent_tasks.values() if status.status == "failed")
        
        return response_formatter.success_response(
            data={
                "history": {task_id: status.dict() for task_id, status in recent_tasks.items()},
                "summary": {
                    "total_tasks": len(recent_tasks),
                    "completed": completed_count,
                    "failed": failed_count,
                    "success_rate": f"{(completed_count / len(recent_tasks) * 100):.1f}%" if recent_tasks else "N/A"
                }
            },
            message="Training history retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting training history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/train/quick")
async def quick_train_single_model(
    model_type: str = Form(...),
    dataset_path: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None
):
    """Quick training for a single model"""
    try:
        # Validate model type
        valid_models = ["random_forest", "isolation_forest", "one_class_svm", "autoencoder"]
        if model_type not in valid_models:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model type: {model_type}. Valid options: {valid_models}"
            )
        
        # Create training request for single model
        request = TrainingRequest(
            dataset_path=dataset_path,
            model_types=[model_type]
        )
        
        # Start training
        from datetime import datetime
        task_id = f"quick_{model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        training_tasks[task_id] = TrainingStatus(
            task_id=task_id,
            status="started",
            progress=0.0,
            message=f"Quick training {model_type} model",
            models_completed=[]
        )
        
        background_tasks.add_task(
            train_models_background,
            task_id,
            request
        )
        
        return response_formatter.training_response(
            task_id=task_id,
            status="started",
            message=f"Quick training started for {model_type}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in quick training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/train/cancel/{task_id}")
async def cancel_training(task_id: str):
    """Cancel a training task (if possible)"""
    try:
        if task_id not in training_tasks:
            raise HTTPException(status_code=404, detail="Training task not found")
        
        status = training_tasks[task_id]
        
        if status.status in ["completed", "failed"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel task with status: {status.status}"
            )
        
        # Mark as cancelled (actual cancellation depends on implementation)
        status.status = "cancelled"
        status.message = "Training cancelled by user"
        
        return response_formatter.success_response(
            data={"task_id": task_id, "status": "cancelled"},
            message="Training task cancelled"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/train/recommendations")
async def get_training_recommendations(
    dataset_size: Optional[str] = None,  # 'small', 'medium', 'large'
    priority: Optional[str] = None       # 'speed', 'accuracy', 'balanced'
):
    """Get recommendations for which models to train"""
    try:
        recommendations = []
        
        # Base recommendations
        all_models = [
            {
                "model": "random_forest",
                "description": "General-purpose, high accuracy",
                "pros": ["High accuracy", "Feature importance", "Robust"],
                "cons": ["Slower than simpler models"],
                "use_cases": ["General intrusion detection", "Feature analysis"]
            },
            {
                "model": "isolation_forest",
                "description": "Unsupervised anomaly detection",
                "pros": ["Fast", "No labeled anomalies needed", "Good for outliers"],
                "cons": ["May have more false positives"],
                "use_cases": ["Unknown attack patterns", "Real-time detection"]
            },
            {
                "model": "one_class_svm",
                "description": "Novelty detection",
                "pros": ["Good for small datasets", "Effective boundary learning"],
                "cons": ["Sensitive to parameters", "Slower training"],
                "use_cases": ["Zero-day attacks", "Limited training data"]
            },
            {
                "model": "autoencoder",
                "description": "Deep learning anomaly detection",
                "pros": ["Complex pattern recognition", "Feature learning"],
                "cons": ["Requires more data", "Longer training time"],
                "use_cases": ["Complex attacks", "Large datasets"]
            }
        ]
        
        # Adjust recommendations based on parameters
        for model_info in all_models:
            score = 50  # Base score
            
            # Dataset size considerations
            if dataset_size == "small":
                if model_info["model"] in ["one_class_svm", "isolation_forest"]:
                    score += 20
                elif model_info["model"] == "autoencoder":
                    score -= 15
            elif dataset_size == "large":
                if model_info["model"] in ["random_forest", "autoencoder"]:
                    score += 20
                elif model_info["model"] == "one_class_svm":
                    score -= 10
            
            # Priority considerations
            if priority == "speed":
                if model_info["model"] == "isolation_forest":
                    score += 25
                elif model_info["model"] == "autoencoder":
                    score -= 20
            elif priority == "accuracy":
                if model_info["model"] == "random_forest":
                    score += 25
                elif model_info["model"] == "isolation_forest":
                    score -= 10
            
            model_info["recommendation_score"] = score
            recommendations.append(model_info)
        
        # Sort by score
        recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
        
        return response_formatter.success_response(
            data={
                "recommendations": recommendations,
                "criteria": {
                    "dataset_size": dataset_size,
                    "priority": priority
                },
                "suggested_training_order": [r["model"] for r in recommendations[:3]]
            },
            message="Training recommendations generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating training recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def train_models_background(task_id: str, request: TrainingRequest):
    """Background task for training models"""
    try:
        logger.info(f"Starting background training for task {task_id}")
        status = training_tasks[task_id]
        status.status = "in_progress"
        status.message = "Loading and processing dataset"
        status.progress = 5.0
        
        # Use default dataset if none provided
        dataset_path = request.dataset_path or "c:\\Users\\adnan\\OneDrive\\Documents\\Projects\\Zero_Day_Attack\\dataset\\unswnb15_dataset.csv"
        
        # Process dataset
        logger.info(f"Processing dataset: {dataset_path}")
        processed_data = data_processor.process_dataset(dataset_path)
        
        status.message = "Dataset processed, starting model training"
        status.progress = 20.0
        
        # Train each model
        total_models = len(request.model_types)
        results = {}
        
        for i, model_type in enumerate(request.model_types):
            try:
                status.current_model = model_type
                status.message = f"Training {model_type} model ({i+1}/{total_models})"
                logger.info(f"Training {model_type} model for task {task_id}")
                
                # Train the model
                result = model_trainer.train_model(
                    model_type,
                    processed_data["X_train"],
                    processed_data["X_test"],
                    processed_data["y_train"],
                    processed_data["y_test"],
                    processed_data["preprocessor"]
                )
                
                results[model_type] = {
                    "success": True,
                    "performance": result["performance"]
                }
                
                status.models_completed.append(model_type)
                status.progress = 20.0 + (70.0 * (i + 1) / total_models)
                logger.info(f"Completed training {model_type} for task {task_id}")
                
            except Exception as e:
                logger.error(f"Error training {model_type} for task {task_id}: {e}")
                results[model_type] = {
                    "success": False,
                    "error": str(e)
                }
        
        # Final status update
        successful_models = [model for model, result in results.items() if result.get("success")]
        failed_models = [model for model, result in results.items() if not result.get("success")]
        
        if successful_models:
            status.status = "completed"
            status.message = f"Training completed. Success: {len(successful_models)}, Failed: {len(failed_models)}"
            status.progress = 100.0
            logger.info(f"Training task {task_id} completed successfully")
        else:
            status.status = "failed"
            status.message = "All model training failed"
            status.error_details = f"Failed models: {failed_models}"
            logger.error(f"Training task {task_id} failed completely")
        
    except Exception as e:
        logger.error(f"Background training failed for task {task_id}: {e}")
        status = training_tasks[task_id]
        status.status = "failed"
        status.message = f"Training failed: {str(e)}"
        status.error_details = str(e)
