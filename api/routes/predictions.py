from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import json
import logging
from models.predictor import NetworkPredictor
from utils.file_handler import FileHandler
from utils.response_formatter import ResponseFormatter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["predictions"])

# Initialize components
predictor = NetworkPredictor()
file_handler = FileHandler()
response_formatter = ResponseFormatter()

# Pydantic models for request validation
class NetworkDataSample(BaseModel):
    dur: float
    spkts: int
    dpkts: int
    sbytes: int
    dbytes: int
    rate: float
    sload: float
    dload: float
    proto: str
    service: str
    state: str
    # Add other fields as needed based on your dataset

class SinglePredictionRequest(BaseModel):
    data: NetworkDataSample
    model_type: Optional[str] = "random_forest"

class BatchPredictionRequest(BaseModel):
    data: List[NetworkDataSample]
    model_type: Optional[str] = "random_forest"

class EnsemblePredictionRequest(BaseModel):
    data: List[NetworkDataSample]
    model_types: Optional[List[str]] = ["random_forest", "isolation_forest"]

@router.post("/predict/single")
async def predict_single(request: SinglePredictionRequest):
    """Make a single prediction on network traffic data"""
    try:
        # Convert request data to dictionary
        network_data = request.data.dict()
        
        # Make real-time prediction
        result = predictor.predict_realtime(network_data, request.model_type)
        
        return response_formatter.success_response(
            data=result,
            message="Single prediction completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error in single prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/batch")
async def predict_batch_data(request: BatchPredictionRequest):
    """Make batch predictions on multiple network traffic samples"""
    try:
        if not request.data:
            raise HTTPException(status_code=400, detail="No data provided for prediction")
        
        # Convert request data to DataFrame
        data_dicts = [sample.dict() for sample in request.data]
        df = pd.DataFrame(data_dicts)
        
        # Make predictions
        result = predictor.predict_batch(df, request.model_type)
        
        return response_formatter.prediction_response(
            predictions=result["predictions"],
            model_type=request.model_type,
            additional_data={
                "batch_summary": result["batch_summary"],
                "risk_level": result["risk_level"],
                "attack_percentage": result["attack_percentage"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/file")
async def predict_from_file(
    file: UploadFile = File(...),
    model_type: str = Form("random_forest")
):
    """Make predictions from uploaded CSV file"""
    try:
        # Validate file type
        if not file.filename.endswith(('.csv', '.CSV')):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        # Save uploaded file
        file_path = await file_handler.save_uploaded_file(file)
        
        # Read the data
        df = pd.read_csv(file_path)
        
        # Make batch predictions
        result = predictor.predict_batch(df, model_type)
        
        # Save results to file
        results_file = file_handler.save_predictions(result, model_type)
        
        return response_formatter.success_response(
            data={
                "predictions_summary": result["batch_summary"],
                "risk_assessment": {
                    "risk_level": result["risk_level"],
                    "attack_percentage": result["attack_percentage"]
                },
                "results_file": results_file,
                "total_predictions": len(result["predictions"])
            },
            message="File predictions completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in file prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/ensemble")
async def predict_with_ensemble(request: EnsemblePredictionRequest):
    """Make predictions using multiple models (ensemble approach)"""
    try:
        if not request.data:
            raise HTTPException(status_code=400, detail="No data provided for prediction")
        
        # Convert request data to DataFrame
        data_dicts = [sample.dict() for sample in request.data]
        df = pd.DataFrame(data_dicts)
        
        # Make ensemble predictions
        result = predictor.predict_with_multiple_models(df, request.model_types)
        
        return response_formatter.success_response(
            data=result,
            message="Ensemble predictions completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ensemble prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predict/capabilities/{model_type}")
async def get_prediction_capabilities(model_type: str):
    """Get prediction capabilities for a specific model"""
    try:
        capabilities = predictor.get_model_capabilities(model_type)
        
        return response_formatter.success_response(
            data=capabilities,
            message=f"Prediction capabilities for {model_type} retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting capabilities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/realtime/stream")
async def process_realtime_stream(
    network_samples: List[NetworkDataSample],
    model_type: str = "random_forest",
    threshold_confidence: float = 0.8
):
    """Process real-time stream of network data"""
    try:
        results = []
        alerts = []
        
        for i, sample in enumerate(network_samples):
            # Make prediction for each sample
            prediction_result = predictor.predict_realtime(sample.dict(), model_type)
            
            # Add sample index for tracking
            prediction_result["sample_index"] = i
            results.append(prediction_result)
            
            # Check for alerts
            if prediction_result["is_attack"]:
                confidence = prediction_result.get("confidence", 1.0)
                if confidence >= threshold_confidence:
                    alerts.append({
                        "sample_index": i,
                        "alert_level": "HIGH" if confidence >= 0.9 else "MEDIUM",
                        "confidence": confidence,
                        "prediction": prediction_result["prediction_label"],
                        "timestamp": prediction_result["timestamp"]
                    })
        
        # Calculate stream statistics
        total_samples = len(results)
        attacks_detected = sum(1 for r in results if r["is_attack"])
        
        stream_summary = {
            "total_samples": total_samples,
            "attacks_detected": attacks_detected,
            "normal_traffic": total_samples - attacks_detected,
            "attack_rate": (attacks_detected / total_samples) * 100 if total_samples > 0 else 0,
            "alerts_generated": len(alerts),
            "model_used": model_type
        }
        
        return response_formatter.success_response(
            data={
                "predictions": results,
                "alerts": alerts,
                "stream_summary": stream_summary
            },
            message="Real-time stream processing completed"
        )
        
    except Exception as e:
        logger.error(f"Error in real-time stream processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predict/history")
async def get_prediction_history(limit: int = 10):
    """Get recent prediction history"""
    try:
        # Get recent result files
        results = file_handler.list_results()
        
        # Limit the results
        recent_results = results[:limit]
        
        # Load summary information from each result file
        history = []
        for result in recent_results:
            try:
                with open(result["path"], 'r') as f:
                    data = json.load(f)
                    history.append({
                        "filename": result["filename"],
                        "created_at": result["created_at"],
                        "model_type": data.get("model_type", "unknown"),
                        "summary": data.get("summary", {})
                    })
            except Exception as e:
                logger.warning(f"Error reading result file {result['filename']}: {e}")
                continue
        
        return response_formatter.success_response(
            data={
                "history": history,
                "total_available": len(results),
                "showing": len(history)
            },
            message="Prediction history retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting prediction history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/predict/history/{filename}")
async def delete_prediction_result(filename: str):
    """Delete a specific prediction result file"""
    try:
        import os
        file_path = f"results/{filename}"
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Result file {filename} not found")
        
        os.remove(file_path)
        
        return response_formatter.success_response(
            data={"deleted_file": filename},
            message=f"Prediction result {filename} deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting prediction result: {e}")
        raise HTTPException(status_code=500, detail=str(e))
