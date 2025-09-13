from fastapi import APIRouter, HTTPException, BackgroundTasks, Form, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import threading
import time
import pandas as pd
from datetime import datetime
from models.model_trainer import ModelTrainer
from models.data_processor import DataProcessor
from utils.response_formatter import ResponseFormatter
from utils.file_handler import FileHandler

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["training"])

# Initialize components
model_trainer = ModelTrainer()
data_processor = DataProcessor()
response_formatter = ResponseFormatter()
file_handler = FileHandler()

# Global dictionary for training status tracking (thread-safe)
training_jobs = {}
job_lock = threading.Lock()

class TrainingRequest(BaseModel):
    dataset_path: Optional[str] = None
    model_types: List[str] = ["random_forest", "isolation_forest", "one_class_svm", "autoencoder"]
    test_size: float = 0.2
    random_state: int = 42
    outlier_method: str = "iqr_cap"

class SimpleTrainingRequest(BaseModel):
    model_name: str
    test_size: float = 0.2

@router.post("/models/train")
async def train_model_simple(model_name: str = Form(...), file: UploadFile = File(...), test_size: float = Form(0.2)):
    """
    Train a single model with integrated preprocessing pipeline
    This is the new simplified training endpoint
    """
    try:
        # Validate model name
        valid_models = ["random_forest", "isolation_forest", "one_class_svm"]
        if model_name not in valid_models:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model name: {model_name}. Valid options: {valid_models}"
            )
        
        # Save uploaded file
        file_path = file_handler.save_uploaded_file(file, "datasets")
        
        # Load dataset
        logger.info(f"Loading dataset from {file_path}")
        df = pd.read_csv(file_path)
        
        # Check for required column
        if "label" not in df.columns:
            # Try common variations
            if "Label" in df.columns:
                df = df.rename(columns={"Label": "label"})
            elif "Class" in df.columns:
                df = df.rename(columns={"Class": "label"})
                # Map class labels if needed
                if df['label'].dtype == 'object':
                    df['label'] = df['label'].map({'Normal': 0, 'Attack': 1})
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Dataset must contain a 'label' column (or 'Label'/'Class' column that can be mapped to labels)"
                )
        
        # Train model with integrated pipeline
        logger.info(f"Starting training for {model_name} with {len(df)} samples")
        result = model_trainer.train_and_save_model(df, model_name, test_size)
        
        logger.info(f"Training completed for {model_name}")
        
        return {
            "success": True,
            "message": f"Model {model_name} trained and saved successfully",
            "model_name": model_name,
            "model_path": result["model_path"],
            "performance": result["performance"],
            "training_info": {
                "training_samples": result["training_samples"],
                "test_samples": result["test_samples"],
                "total_samples": len(df),
                "test_size": test_size
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error training model {model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

def update_job_status(task_id: str, **updates):
    """Thread-safe job status update"""
    with job_lock:
        if task_id in training_jobs:
            training_jobs[task_id].update(updates)

def run_training_thread(task_id: str, request: TrainingRequest):
    """Run training in a separate thread"""
    try:
        logger.info(f"Starting background training thread for task {task_id}")
        
        update_job_status(task_id, 
            status="in_progress", 
            message="Loading and processing dataset", 
            progress=5.0
        )
        
        # Use default dataset if none provided
        dataset_path = request.dataset_path or "c:\\Users\\adnan\\OneDrive\\Documents\\Projects\\Zero_Day_Attack\\dataset\\unswnb15_dataset.csv"
        
        # Process dataset
        logger.info(f"Processing dataset: {dataset_path}")
        processed_data = data_processor.process_dataset(dataset_path)
        
        update_job_status(task_id, 
            message="Dataset processed, starting model training", 
            progress=20.0
        )
        
        # Train each model
        total_models = len(request.model_types)
        results = {}
        model_paths = {}
        model_metrics = {}
        
        for i, model_type in enumerate(request.model_types):
            try:
                update_job_status(task_id, 
                    current_model=model_type,
                    message=f"Training {model_type} model ({i+1}/{total_models})"
                )
                
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
                
                # Store model path and metrics
                model_path = f"saved_models/{model_type}.pkl"
                model_paths[model_type] = model_path
                model_metrics[model_type] = result["performance"]
                
                # Update completed models list
                with job_lock:
                    if task_id in training_jobs:
                        if "models_completed" not in training_jobs[task_id]:
                            training_jobs[task_id]["models_completed"] = []
                        training_jobs[task_id]["models_completed"].append(model_type)
                
                update_job_status(task_id, 
                    progress=20.0 + (70.0 * (i + 1) / total_models)
                )
                
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
            update_job_status(task_id,
                status="completed",
                message=f"Training completed. Success: {len(successful_models)}, Failed: {len(failed_models)}",
                progress=100.0,
                model_paths=model_paths,
                model_metrics=model_metrics
            )
            logger.info(f"Training task {task_id} completed successfully")
        else:
            update_job_status(task_id,
                status="failed",
                message="All model training failed",
                error_details=f"Failed models: {failed_models}"
            )
            logger.error(f"Training task {task_id} failed completely")
        
    except Exception as e:
        logger.error(f"Background training failed for task {task_id}: {e}")
        update_job_status(task_id,
            status="failed",
            message=f"Training failed: {str(e)}",
            error_details=str(e)
        )

@router.post("/train")
async def start_training(request: TrainingRequest):
    """Start model training in background thread"""
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
        task_id = f"training_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Initialize training status in thread-safe way
        with job_lock:
            training_jobs[task_id] = {
                "task_id": task_id,
                "status": "started",
                "progress": 0.0,
                "message": "Training job initialized",
                "models_completed": [],
                "current_model": None,
                "error_details": None,
                "created_at": datetime.now().isoformat()
            }
        
        # Start training in background thread
        training_thread = threading.Thread(
            target=run_training_thread,
            args=(task_id, request),
            daemon=True
        )
        training_thread.start()
        
        logger.info(f"Started training thread for task {task_id}")
        
        return {
            "success": True,
            "task_id": task_id,
            "status": "started", 
            "progress": 0,
            "message": "Training started in background"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/train/status/{task_id}")
async def get_training_status(task_id: str):
    """Get training status for a specific task - instant response"""
    try:
        with job_lock:
            if task_id not in training_jobs:
                raise HTTPException(status_code=404, detail="Training task not found")
            
            job_data = training_jobs[task_id].copy()
        
        return {
            "success": True,
            "data": job_data,
            "message": "Training status retrieved successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting training status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/train/active")
async def get_active_training_tasks():
    """Get all active training tasks"""
    try:
        with job_lock:
            active_tasks = {
                task_id: job_data 
                for task_id, job_data in training_jobs.items()
                if job_data.get("status") in ["started", "in_progress"]
            }
        
        return {
            "success": True,
            "data": {
                "active_tasks": active_tasks,
                "total_active": len(active_tasks)
            },
            "message": "Active training tasks retrieved successfully"
        }
        
    except Exception as e:
        logger.error(f"Error getting active tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/train/history")
async def get_training_history(limit: int = 10):
    """Get training history"""
    try:
        with job_lock:
            # Get recent training tasks
            sorted_tasks = sorted(
                training_jobs.items(),
                key=lambda x: x[0],  # Sort by task_id (which includes timestamp)
                reverse=True
            )
        
        recent_tasks = dict(sorted_tasks[:limit])
        
        # Calculate summary statistics
        completed_count = sum(1 for job_data in recent_tasks.values() if job_data.get("status") == "completed")
        failed_count = sum(1 for job_data in recent_tasks.values() if job_data.get("status") == "failed")
        
        return {
            "success": True,
            "data": {
                "history": recent_tasks,
                "summary": {
                    "total_tasks": len(recent_tasks),
                    "completed": completed_count,
                    "failed": failed_count,
                    "success_rate": f"{(completed_count / len(recent_tasks) * 100):.1f}%" if recent_tasks else "N/A"
                }
            },
            "message": "Training history retrieved successfully"
        }
        
    except Exception as e:
        logger.error(f"Error getting training history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/train/{task_id}")
async def delete_training_job(task_id: str):
    """Delete a training job and its associated model files"""
    try:
        with job_lock:
            if task_id not in training_jobs:
                raise HTTPException(status_code=404, detail="Training job not found")
            
            job_data = training_jobs[task_id].copy()
        
        # Delete associated model files if they exist
        if "model_paths" in job_data and job_data["model_paths"]:
            import os
            for model_type, model_path in job_data["model_paths"].items():
                full_path = os.path.join("C:\\Users\\adnan\\OneDrive\\Documents\\Projects\\Zero_Day_Attack\\api", model_path)
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                        logger.info(f"Deleted model file: {full_path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete model file {full_path}: {e}")
        
        # Remove from memory
        with job_lock:
            if task_id in training_jobs:
                del training_jobs[task_id]
        
        return {
            "success": True,
            "message": f"Training job {task_id} and associated files deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting training job {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    except Exception as e:
        logger.error(f"Error getting training history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/train/quick")
async def quick_train_single_model(
    model_type: str = Form(...),
    dataset_path: Optional[str] = Form(None)
):
    """Quick training for a single model using threading"""
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
        task_id = f"quick_{model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Initialize training status in thread-safe way
        with job_lock:
            training_jobs[task_id] = {
                "task_id": task_id,
                "status": "started",
                "progress": 0.0,
                "message": f"Quick training {model_type} model",
                "models_completed": [],
                "current_model": None,
                "error_details": None,
                "created_at": datetime.now().isoformat()
            }
        
        # Start training in background thread
        training_thread = threading.Thread(
            target=run_training_thread,
            args=(task_id, request),
            daemon=True
        )
        training_thread.start()
        
        return {
            "success": True,
            "task_id": task_id,
            "status": "started",
            "message": f"Quick training started for {model_type}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in quick training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/train/cancel/{task_id}")
async def cancel_training(task_id: str):
    """Cancel a training task (if possible)"""
    try:
        with job_lock:
            if task_id not in training_jobs:
                raise HTTPException(status_code=404, detail="Training task not found")
            
            job_data = training_jobs[task_id]
            
            if job_data.get("status") in ["completed", "failed"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot cancel task with status: {job_data.get('status')}"
                )
            
            # Mark as cancelled (actual cancellation depends on implementation)
            training_jobs[task_id].update({
                "status": "cancelled",
                "message": "Training cancelled by user"
            })
        
        return {
            "success": True,
            "data": {"task_id": task_id, "status": "cancelled"},
            "message": "Training task cancelled"
        }
        
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
