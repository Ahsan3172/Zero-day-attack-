import { useState, useEffect, useRef, useCallback } from "react";
import { Brain, Play, Pause, RotateCcw, TrendingUp, CheckCircle, Shield, AlertCircle, Clock, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { tokenManager } from "@/services/api";

interface TrainingStatus {
  task_id: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  models_completed: string[];
  current_model?: string;
  error_details?: string;
}

const ModelTraining = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [selectedModels, setSelectedModels] = useState<string[]>(["random_forest"]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<string>("");
  const [completedModels, setCompletedModels] = useState<string[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user has admin role
  const isAdmin = Boolean(user && user.role === 'admin');

  const models = [
    { id: "random_forest", name: "Random Forest", status: "recommended", description: "Best for accuracy" },
    { id: "isolation_forest", name: "Isolation Forest", status: "fast", description: "Fast anomaly detection" },
    { id: "one_class_svm", name: "One Class SVM", status: "available", description: "Good for small datasets" },
    { id: "autoencoder", name: "Deep Autoencoder", status: "advanced", description: "Complex pattern learning" },
  ];

  const toggleModelSelection = (modelId: string) => {
    if (!isAdmin || isTraining) return;
    
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const getAuthHeaders = useCallback(() => {
    const token = tokenManager.getToken();
    console.log('🔑 Token from tokenManager:', token ? 'Present' : 'Missing');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const startTraining = async () => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can train models",
        variant: "destructive",
      });
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "No Models Selected",
        description: "Please select at least one model to train",
        variant: "destructive",
      });
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);
    setCurrentModel(null);
    setTrainingStatus("Initializing training...");
    setCompletedModels([]);
    setErrorDetails(null);

    try {
      console.log('🚀 Starting training request...');
      console.log('📦 Payload:', { model_types: selectedModels, test_size: 0.2, random_state: 42 });
      
      const response = await fetch('http://localhost:5000/api/models/train', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          model_types: selectedModels,
          test_size: 0.2,
          random_state: 42,
          dataset_path: null // Use default dataset
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      // Check if response has content before parsing JSON
      const responseText = await response.text();
      console.log('📄 Raw response:', responseText);
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('🚫 JSON Parse Error:', parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        // Handle specific HTTP status codes
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        } else if (response.status === 404) {
          throw new Error('Training endpoint not found. Please check the server configuration.');
        } else {
          throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      }

      if (data.success && data.data?.task_id) {
        setCurrentTaskId(data.data.task_id);
        setTrainingStatus("Training started successfully");
        
        // Start polling for status updates
        startPolling(data.data.task_id);

        toast({
          title: "Training Started",
          description: `Training ${selectedModels.length} model(s)`,
        });
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (error) {
      console.error('Training start error:', error);
      setIsTraining(false);
      setErrorDetails(error instanceof Error ? error.message : 'Unknown error');
      setTrainingStatus("Failed to start training");
      
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Failed to start training",
        variant: "destructive",
      });
    }
  };

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback((taskId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/models/train/status/${taskId}`, {
          headers: getAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          const status: TrainingStatus = data.data;
          
          setTrainingProgress(status.progress || 0);
          setTrainingStatus(status.message || "Training in progress");
          setCurrentModel(status.current_model || null);
          setCompletedModels(status.models_completed || []);
          
          if (status.error_details) {
            setErrorDetails(status.error_details);
          }

          // Check if training is complete
          if (status.status === 'completed') {
            setIsTraining(false);
            setTrainingProgress(100);
            setCurrentModel(null);
            stopPolling();
            
            toast({
              title: "Training Completed",
              description: `Successfully trained ${status.models_completed?.length || 0} models`,
            });
          } else if (status.status === 'failed') {
            setIsTraining(false);
            setErrorDetails(status.error_details || "Training failed");
            stopPolling();
            
            toast({
              title: "Training Failed",
              description: status.error_details || "Training process failed",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Don't stop polling on individual request failures
        // The user might want to see if the training recovers
      }
    }, 3000);
  }, [getAuthHeaders, toast, stopPolling]);

  const cancelTraining = useCallback(async () => {
    if (!currentTaskId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/models/train/cancel/${currentTaskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        setIsTraining(false);
        setTrainingStatus("Training cancelled");
        stopPolling();
        
        toast({
          title: "Training Cancelled",
          description: "Training process was cancelled successfully",
        });
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel training",
        variant: "destructive",
      });
    }
  }, [currentTaskId, getAuthHeaders, toast, stopPolling]);

  const resetTraining = () => {
    if (isTraining) return;
    
    setTrainingProgress(0);
    setCurrentModel(null);
    setTrainingStatus("");
    setCompletedModels([]);
    setCurrentTaskId(null);
    setErrorDetails(null);
    stopPolling();
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const getModelBadgeVariant = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model?.status === "recommended") return "default";
    if (model?.status === "fast") return "secondary";
    if (model?.status === "advanced") return "outline";
    return "outline";
  };

  const isModelCompleted = (modelId: string) => completedModels.includes(modelId);
  const isCurrentModel = (modelId: string) => currentModel === modelId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>Model Training</span>
          {isAdmin && (
            <Badge variant="secondary" className="ml-2">
              <Shield className="h-3 w-3 mr-1" />
              Admin Only
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isAdmin ? (
          <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg border border-dashed">
            <div className="text-center space-y-2">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-medium text-muted-foreground">Admin Access Required</h3>
              <p className="text-sm text-muted-foreground">
                Only administrators can access model training functionality.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Select Models to Train</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {models.map((model) => (
                  <Button
                    key={model.id}
                    variant={selectedModels.includes(model.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleModelSelection(model.id)}
                    className="group justify-between text-xs sm:text-sm h-auto py-3 px-3 relative"
                    disabled={!isAdmin || isTraining}
                  >
                    <div className="flex flex-col items-start space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="truncate">{model.name}</span>
                        {isModelCompleted(model.id) && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                        {isCurrentModel(model.id) && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-blue-500 animate-pulse" />
                            <span className="text-xs text-blue-500">Training</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-xs transition-colors ${
                        selectedModels.includes(model.id) 
                          ? 'text-gray-100 group-hover:text-white' 
                          : 'text-muted-foreground group-hover:text-white'
                      }`}>{model.description}</span>
                    </div>
                    <Badge variant={getModelBadgeVariant(model.id)} className="ml-1 text-xs shrink-0">
                      {model.status === "recommended" && "Best"}
                      {model.status === "fast" && <Zap className="h-3 w-3" />}
                      {model.status === "advanced" && "AI"}
                      {model.status === "available" && "Good"}
                    </Badge>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {selectedModels.length} model(s)
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Training Progress</h4>
                <span className="text-sm text-muted-foreground">
                  {Math.round(trainingProgress)}%
                </span>
              </div>
              <Progress value={trainingProgress} className="h-2" />
              {trainingStatus && (
                <p className="text-xs text-muted-foreground">{trainingStatus}</p>
              )}
              {currentModel && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span className="text-sm text-blue-600">
                    Currently training: {models.find(m => m.id === currentModel)?.name || currentModel}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={startTraining}
                disabled={isTraining || !isAdmin || selectedModels.length === 0}
                className="cyber-glow text-xs sm:text-sm"
              >
                {isTraining ? (
                  <>
                    <Pause className="h-4 w-4 mr-1 sm:mr-2" />
                    Training...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1 sm:mr-2" />
                    Start Training
                  </>
                )}
              </Button>
              
              {isTraining && (
                <Button 
                  variant="destructive" 
                  onClick={cancelTraining}
                  className="text-xs sm:text-sm"
                >
                  Cancel Training
                </Button>
              )}
              
              <Button 
                variant="outline" 
                disabled={isTraining || !isAdmin} 
                onClick={resetTraining}
                className="text-xs sm:text-sm"
              >
                <RotateCcw className="h-4 w-4 mr-1 sm:mr-2" />
                Reset
              </Button>
            </div>

            {errorDetails && (
              <div className="flex items-start space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Training Error</p>
                  <p className="text-xs text-destructive/80 break-words mt-1">
                    {errorDetails}
                  </p>
                </div>
              </div>
            )}

            {trainingProgress === 100 && !errorDetails && (
              <div className="flex items-center space-x-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium">Training Complete</p>
                  <p className="text-xs text-muted-foreground break-words">
                    Successfully trained {completedModels.length} model(s): {completedModels.map(id => models.find(m => m.id === id)?.name || id).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {completedModels.length > 0 && trainingProgress < 100 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-success">Completed Models</h5>
                <div className="flex flex-wrap gap-1">
                  {completedModels.map(modelId => (
                    <Badge key={modelId} variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {models.find(m => m.id === modelId)?.name || modelId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelTraining;