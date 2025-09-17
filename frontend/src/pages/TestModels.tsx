import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, AlertCircle, CheckCircle, FileText, BarChart3, Activity, History, ChevronDown, Clock, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ModelTestResults {
  success: boolean;
  model_name: string;
  dataset_info: {
    original_samples: number;
    cleaned_samples: number;
    original_features?: number;
    final_features?: number;
    features?: number; // Keep for backward compatibility
    outliers_removed: number;
    cleaning_applied: boolean;
    feature_engineering_applied?: boolean;
  };
  performance_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    confusion_matrix: number[][];
  };
  predictions_summary: {
    total_predictions: number;
    attacks_detected: number;
    normal_detected: number;
    attack_percentage: number;
  };
  probabilities_available?: boolean;
  confidence_scores?: {
    mean_confidence: number;
    min_confidence: number;
    max_confidence: number;
  };
}

interface TestHistoryItem {
  id: number;
  model_name: string;
  dataset_filename: string;
  accuracy: number;
  precision_score: number;
  recall_score: number;
  f1_score: number;
  confusion_matrix: number[][];
  classification_report: any;
  prediction_results: any;
  execution_time: number;
  created_at: string;
}

const TestModels = () => {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<ModelTestResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [history, setHistory] = useState<TestHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Utility function to make authenticated API calls
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  // Fetch available trained models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoadingModels(true);
        const response = await fetch("http://localhost:8000/api/v1/models/available");
        const data = await response.json();
        
        if (data.success) {
          setModels(data.models || []);
          toast({
            title: "Models loaded",
            description: `Found ${data.models?.length || 0} trained models`,
          });
        } else {
          toast({
            title: "No models found",
            description: "Please train some models first",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        toast({
          title: "Error",
          description: "Failed to load available models",
          variant: "destructive"
        });
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [toast]);

  // Fetch testing history - user-specific results from backend
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        setLoadingHistory(true);
        // Use the backend API endpoint to get user-specific results
        const data = await fetchWithAuth("http://localhost:5000/api/models/results?limit=50");
        
        if (data.success) {
          // Transform the API response to match the TestHistoryItem interface
          const transformedHistory: TestHistoryItem[] = data.data.results.map((result: any) => ({
            id: result.id,
            model_name: result.model_name,
            dataset_filename: result.dataset_name,
            accuracy: result.accuracy,
            precision_score: result.precision_score,
            recall_score: result.recall_score,
            f1_score: result.f1_score,
            confusion_matrix: result.confusion_matrix || [],
            classification_report: result.classification_report || {},
            prediction_results: result.prediction_results || {},
            execution_time: result.execution_time || 0,
            created_at: result.created_at
          }));
          
          setHistory(transformedHistory);
          console.log(`Testing history loaded for user ${user.username} (ID: ${user.id}):`, transformedHistory);
        } else {
          console.warn("Failed to fetch history:", data);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
        toast({
          title: "Warning",
          description: "Could not load testing history",
          variant: "destructive"
        });
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated, user, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        toast({
          title: "File uploaded",
          description: `${selectedFile.name} ready for testing`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !selectedModel) {
      toast({
        title: "Missing requirements",
        description: "Please select a model and upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to test models",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model_name", selectedModel);
      formData.append("user_id", user.id.toString()); // Use authenticated user's ID

      const response = await fetch("http://localhost:8000/api/v1/models/test", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResults(data);
        toast({
          title: "Testing completed",
          description: `Model ${selectedModel} tested successfully`,
        });
        
        // Refresh history after successful test - use authenticated API call
        try {
          const historyData = await fetchWithAuth("http://localhost:5000/api/models/results?limit=50");
          if (historyData.success) {
            const transformedHistory: TestHistoryItem[] = historyData.data.results.map((result: any) => ({
              id: result.id,
              model_name: result.model_name,
              dataset_filename: result.dataset_name,
              accuracy: result.accuracy,
              precision_score: result.precision_score,
              recall_score: result.recall_score,
              f1_score: result.f1_score,
              confusion_matrix: result.confusion_matrix || [],
              classification_report: result.classification_report || {},
              prediction_results: result.prediction_results || {},
              execution_time: result.execution_time || 0,
              created_at: result.created_at
            }));
            setHistory(transformedHistory);
          }
        } catch (historyError) {
          console.warn("Failed to refresh history:", historyError);
        }
      } else {
        throw new Error(data.error || "Testing failed");
      }
    } catch (error) {
      console.error("Error testing model:", error);
      toast({
        title: "Testing failed",
        description: error instanceof Error ? error.message : "An error occurred during testing",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Authentication guard
  if (!isAuthenticated || !user) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-warning mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access model testing and view your testing history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Test Trained Models</h1>
      </div>

      {/* Model Selection */}
      <Card className="bg-gray-900 shadow-xl border-gray-700">
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">Select Trained Model</span>
                <p className="text-sm text-gray-400 font-normal mt-1">
                  Choose from your trained ML models for testing
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {models.length > 0 && (
                <span className="bg-green-900/30 text-green-300 px-2 py-1 rounded-full border border-green-700">
                  {models.length} model{models.length !== 1 ? 's' : ''} available
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-gray-900">
          {loadingModels ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400 mb-4"></div>
              <p className="text-lg font-medium text-white">Loading available models...</p>
              <p className="text-sm text-gray-400">Scanning for trained models in your workspace</p>
            </div>
          ) : models.length > 0 ? (
            <div className="space-y-4">
              {/* Custom Model Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {models.map((model) => {
                  const isSelected = selectedModel === model;
                  const modelDisplayName = model.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                    <button
                      key={model}
                      onClick={() => setSelectedModel(model)}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all duration-200 text-left group
                        ${isSelected 
                          ? 'border-green-500 bg-green-900/20 shadow-lg shadow-green-500/20' 
                          : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-750 hover:shadow-md'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                          ${isSelected 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600 group-hover:text-gray-300'
                          }
                        `}>
                          {isSelected ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Activity className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className={`
                            font-semibold transition-colors
                            ${isSelected ? 'text-green-300' : 'text-white group-hover:text-gray-200'}
                          `}>
                            {modelDisplayName}
                          </h3>
                          <p className={`
                            text-sm transition-colors
                            ${isSelected ? 'text-green-400' : 'text-gray-400 group-hover:text-gray-300'}
                          `}>
                            {model.includes('forest') && '🌲 Random Forest'}
                            {model.includes('isolation') && '🔍 Isolation Forest'} 
                            {model.includes('svm') && '⚡ SVM Algorithm'}
                            {model.includes('autoencoder') && '🧠 Neural Network'}
                            {!model.includes('forest') && !model.includes('isolation') && !model.includes('svm') && !model.includes('autoencoder') && '🤖 ML Model'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Model Summary */}
              {selectedModel && (
                <div className="mt-6 p-4 bg-green-900/20 rounded-xl border border-green-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-green-300 font-semibold">Selected Model</p>
                      <p className="text-white font-bold">
                        {selectedModel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-green-800/50 text-green-300 rounded-full text-xs font-medium border border-green-700">
                      ✅ Ready for Testing
                    </span>
                    <span className="px-3 py-1 bg-blue-800/50 text-blue-300 rounded-full text-xs font-medium border border-blue-700">
                      🎯 Pre-trained
                    </span>
                    <span className="px-3 py-1 bg-purple-800/50 text-purple-300 rounded-full text-xs font-medium border border-purple-700">
                      🚀 Optimized
                    </span>
                  </div>
                </div>
              )}

              {/* Help Text */}
              <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400">
                  <span className="text-blue-400 font-medium">💡 Tip:</span> Select a model that best fits your network security requirements. 
                  Random Forest models are great for general-purpose detection, while Isolation Forest excels at anomaly detection.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="p-4 bg-gray-800 rounded-full mb-4">
                <AlertCircle className="h-10 w-10 text-gray-500" />
              </div>
              <p className="text-lg font-semibold text-gray-200 mb-2">No trained models found</p>
              <p className="text-sm text-center max-w-md text-gray-400 mb-4">
                You need to train some machine learning models before you can test them. 
                Head over to the Training section to get started.
              </p>
              <div className="space-y-2">
                <div className="px-4 py-2 bg-blue-900/20 rounded-lg border border-blue-800">
                  <p className="text-xs text-blue-300 font-medium">
                    🎯 Train models like Random Forest, Isolation Forest, or SVM
                  </p>
                </div>
                <div className="px-4 py-2 bg-purple-900/20 rounded-lg border border-purple-800">
                  <p className="text-xs text-purple-300 font-medium">
                    📊 Upload your dataset and let the system learn patterns
                  </p>
                </div>
                <div className="px-4 py-2 bg-green-900/20 rounded-lg border border-green-800">
                  <p className="text-xs text-green-300 font-medium">
                    ✨ Once trained, models will appear here for testing
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload Test Dataset</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">Click to upload CSV</span>
                <span className="text-gray-600 font-medium"> or drag and drop</span>
              </label>
              {file && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <div className="text-sm text-gray-700 font-medium">
              <p>• Upload a CSV file with network traffic data</p>
              <p>• Must include a 'label' column for performance evaluation</p>
              <p>• Raw data will be automatically cleaned (missing values, outliers, etc.)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedModel || !file || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Testing Model...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Test Model</span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Dataset Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Dataset Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg border">
                  <p className="text-2xl font-bold text-blue-700">{results.dataset_info.original_samples}</p>
                  <p className="text-sm font-medium text-gray-700">Original Samples</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border">
                  <p className="text-2xl font-bold text-green-700">{results.dataset_info.cleaned_samples}</p>
                  <p className="text-sm font-medium text-gray-700">Cleaned Samples</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg border">
                  <p className="text-2xl font-bold text-purple-700">{results.dataset_info.final_features || results.dataset_info.features}</p>
                  <p className="text-sm font-medium text-gray-700">Features</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border">
                  <p className="text-2xl font-bold text-orange-700">{results.dataset_info.outliers_removed}</p>
                  <p className="text-sm font-medium text-gray-700">Outliers Removed</p>
                </div>
              </div>
              {results.dataset_info.cleaning_applied && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">✅ Data cleaning was automatically applied</p>
                  {results.dataset_info.feature_engineering_applied && (
                    <p className="text-sm font-medium text-green-800 mt-1">🔧 Feature engineering was applied</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Performance Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-3xl font-bold text-blue-700">{formatPercentage(results.performance_metrics.accuracy)}</p>
                  <p className="text-sm font-semibold text-gray-700">Accuracy</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-3xl font-bold text-green-700">{formatPercentage(results.performance_metrics.precision)}</p>
                  <p className="text-sm font-semibold text-gray-700">Precision</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-3xl font-bold text-yellow-700">{formatPercentage(results.performance_metrics.recall)}</p>
                  <p className="text-sm font-semibold text-gray-700">Recall</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-3xl font-bold text-purple-700">{formatPercentage(results.performance_metrics.f1_score)}</p>
                  <p className="text-sm font-semibold text-gray-700">F1 Score</p>
                </div>
              </div>

              {/* Confusion Matrix */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Confusion Matrix</h4>
                <div className="grid grid-cols-2 gap-2 max-w-md">
                  <div className="p-4 bg-green-100 text-center rounded border border-green-300">
                    <p className="text-2xl font-bold text-green-800">{results.performance_metrics.confusion_matrix[0][0]}</p>
                    <p className="text-sm font-medium text-gray-700">True Normal</p>
                  </div>
                  <div className="p-4 bg-red-100 text-center rounded border border-red-300">
                    <p className="text-2xl font-bold text-red-800">{results.performance_metrics.confusion_matrix[0][1]}</p>
                    <p className="text-sm font-medium text-gray-700">False Attack</p>
                  </div>
                  <div className="p-4 bg-orange-100 text-center rounded border border-orange-300">
                    <p className="text-2xl font-bold text-orange-800">{results.performance_metrics.confusion_matrix[1][0]}</p>
                    <p className="text-sm font-medium text-gray-700">False Normal</p>
                  </div>
                  <div className="p-4 bg-blue-100 text-center rounded border border-blue-300">
                    <p className="text-2xl font-bold text-blue-800">{results.performance_metrics.confusion_matrix[1][1]}</p>
                    <p className="text-sm font-medium text-gray-700">True Attack</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predictions Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Predictions Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-300">
                  <p className="text-3xl font-bold text-gray-800">{results.predictions_summary.total_predictions}</p>
                  <p className="text-sm font-semibold text-gray-700">Total Predictions</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-3xl font-bold text-red-700">{results.predictions_summary.attacks_detected}</p>
                  <p className="text-sm font-semibold text-gray-700">Attacks Detected</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-3xl font-bold text-green-700">{results.predictions_summary.normal_detected}</p>
                  <p className="text-sm font-semibold text-gray-700">Normal Traffic</p>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-lg font-semibold text-blue-800">
                  Attack Rate: {results.predictions_summary.attack_percentage}%
                </p>
                <div className="w-full bg-blue-200 rounded-full h-3 mt-2">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${results.predictions_summary.attack_percentage}%` }}
                  ></div>
                </div>
              </div>

              {results.confidence_scores && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-2">Confidence Scores</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-purple-700">{formatPercentage(results.confidence_scores.mean_confidence)}</p>
                      <p className="font-medium text-gray-700">Mean</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-purple-700">{formatPercentage(results.confidence_scores.min_confidence)}</p>
                      <p className="font-medium text-gray-700">Min</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-purple-700">{formatPercentage(results.confidence_scores.max_confidence)}</p>
                      <p className="font-medium text-gray-700">Max</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Testing History - Dark Theme */}
      <Card className="bg-gray-900 shadow-2xl border-gray-700">
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-900 rounded-lg">
                <History className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">Your Testing History</span>
                <p className="text-sm text-gray-400 font-normal mt-1">
                  {history.length === 0 ? `Welcome ${user.username}, no tests yet` : `${user.username}: ${history.length} test${history.length !== 1 ? 's' : ''} completed`}
                </p>
              </div>
            </div>
            {loadingHistory && (
              <div className="flex items-center space-x-2 text-blue-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <span className="text-sm font-medium">Loading...</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-gray-900">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mb-4"></div>
              <p className="text-lg font-medium text-white">Loading test history...</p>
              <p className="text-sm text-gray-400">Please wait while we fetch your testing data</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="p-4 bg-gray-800 rounded-full mb-4">
                <Database className="h-10 w-10 text-gray-500" />
              </div>
              <p className="text-lg font-semibold text-gray-200 mb-2">No personal testing history yet</p>
              <p className="text-sm text-center max-w-md text-gray-400">
                Hi {user.username}! Start testing your models with datasets to see detailed results and performance metrics here. 
                All your test results will be saved and available for review.
              </p>
              <div className="mt-4 px-4 py-2 bg-blue-900/20 rounded-lg border border-blue-800">
                <p className="text-xs text-blue-300 font-medium">
                  💡 Tip: Upload a CSV file and select a model above to run your first test
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-sm">
                    {history.length}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Latest Test</p>
                    <h3 className="text-lg font-semibold text-white">
                      {history[history.length - 1].model_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-gray-300 border-gray-600 hover:border-gray-500"
                    onClick={() => setExpandedHistoryId(expandedHistoryId === history[history.length - 1].id ? null : history[history.length - 1].id)}
                  >
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform ${expandedHistoryId === history[history.length - 1].id ? "rotate-180" : ""}`}
                    />
                    {expandedHistoryId === history[history.length - 1].id ? 'Collapse' : 'Expand'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex items-center space-x-2"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm("Are you sure you want to delete this test result? This action cannot be undone.")) {
                        try {
                          const response = await fetchWithAuth(`http://localhost:5000/api/models/results/${history[history.length - 1].id}`, {
                            method: "DELETE",
                          });
                          
                          if (response.success) {
                            toast({
                              title: "Deleted",
                              description: "Test result deleted successfully",
                            });
                            
                            // Refresh history
                            setHistory((prev) => prev.filter((item) => item.id !== history[history.length - 1].id));
                          } else {
                            throw new Error(response.message || "Failed to delete test result");
                          }
                        } catch (error) {
                          console.error("Error deleting test result:", error);
                          toast({
                            title: "Error",
                            description: error instanceof Error ? error.message : "An error occurred while deleting",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                  >
                    <span>Delete</span>
                  </Button>
                </div>
              </div>

              {expandedHistoryId === history[history.length - 1].id && (
                <div className="bg-gray-850 border-t border-gray-700">
                  <div className="p-6 space-y-6">
                    {/* Performance Metrics Grid */}
                    <div>
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-blue-400" />
                        <span>Performance Metrics</span>
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gray-800 rounded-xl border border-blue-700 shadow-lg">
                          <div className="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-blue-300 font-bold text-lg">{(history[history.length - 1].accuracy * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-xl font-bold text-blue-300">{(history[history.length - 1].accuracy * 100).toFixed(2)}%</p>
                          <p className="text-sm font-semibold text-gray-300">Accuracy</p>
                        </div>
                        <div className="text-center p-4 bg-gray-800 rounded-xl border border-green-700 shadow-lg">
                          <div className="w-12 h-12 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-green-300 font-bold text-lg">{(history[history.length - 1].precision_score * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-xl font-bold text-green-300">{(history[history.length - 1].precision_score * 100).toFixed(2)}%</p>
                          <p className="text-sm font-semibold text-gray-300">Precision</p>
                        </div>
                        <div className="text-center p-4 bg-gray-800 rounded-xl border border-yellow-700 shadow-lg">
                          <div className="w-12 h-12 bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-yellow-300 font-bold text-lg">{(history[history.length - 1].recall_score * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-xl font-bold text-yellow-300">{(history[history.length - 1].recall_score * 100).toFixed(2)}%</p>
                          <p className="text-sm font-semibold text-gray-300">Recall</p>
                        </div>
                        <div className="text-center p-4 bg-gray-800 rounded-xl border border-purple-700 shadow-lg">
                          <div className="w-12 h-12 bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-purple-300 font-bold text-lg">{(history[history.length - 1].f1_score * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-xl font-bold text-purple-300">{(history[history.length - 1].f1_score * 100).toFixed(2)}%</p>
                          <p className="text-sm font-semibold text-gray-300">F1 Score</p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Results Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {/* Confusion Matrix */}
                      {history[history.length - 1].confusion_matrix && Array.isArray(history[history.length - 1].confusion_matrix) && (
                        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
                          <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5 text-indigo-400" />
                            <span>Confusion Matrix</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-gradient-to-br from-green-900/50 to-green-800/50 text-center rounded-lg border border-green-600">
                              <p className="text-2xl font-bold text-green-300">{history[history.length - 1].confusion_matrix[0]?.[0] || 0}</p>
                              <p className="text-sm font-semibold text-green-400">True Normal</p>
                              <p className="text-xs text-green-500 mt-1">Correctly classified as normal</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-red-900/50 to-red-800/50 text-center rounded-lg border border-red-600">
                              <p className="text-2xl font-bold text-red-300">{history[history.length - 1].confusion_matrix[0]?.[1] || 0}</p>
                              <p className="text-sm font-semibold text-red-400">False Positive</p>
                              <p className="text-xs text-red-500 mt-1">Normal classified as attack</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-orange-900/50 to-orange-800/50 text-center rounded-lg border border-orange-600">
                              <p className="text-2xl font-bold text-orange-300">{history[history.length - 1].confusion_matrix[1]?.[0] || 0}</p>
                              <p className="text-sm font-semibold text-orange-400">False Negative</p>
                              <p className="text-xs text-orange-500 mt-1">Attack classified as normal</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-blue-900/50 to-blue-800/50 text-center rounded-lg border border-blue-600">
                              <p className="text-2xl font-bold text-blue-300">{history[history.length - 1].confusion_matrix[1]?.[1] || 0}</p>
                              <p className="text-sm font-semibold text-blue-400">True Positive</p>
                              <p className="text-xs text-blue-500 mt-1">Correctly classified as attack</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Predictions Summary */}
                      {history[history.length - 1].prediction_results && (
                        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
                          <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                            <FileText className="h-5 w-5 text-emerald-400" />
                            <span>Predictions Summary</span>
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                              <span className="font-semibold text-gray-300">Total Predictions</span>
                              <span className="text-lg font-bold text-white">{history[history.length - 1].prediction_results.total_predictions || 0}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-900/30 rounded-lg border border-red-700">
                              <span className="font-semibold text-red-400">🚨 Attacks Detected</span>
                              <span className="text-lg font-bold text-red-300">{history[history.length - 1].prediction_results.attacks_detected || 0}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-green-900/30 rounded-lg border border-green-700">
                              <span className="font-semibold text-green-400">✅ Normal Traffic</span>
                              <span className="text-lg font-bold text-green-300">{history[history.length - 1].prediction_results.normal_detected || 0}</span>
                            </div>
                            <div className="p-3 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-lg border border-blue-700">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-blue-300">Attack Rate</span>
                                <span className="text-lg font-bold text-blue-200">{history[history.length - 1].prediction_results.attack_percentage?.toFixed(1) || 0}%</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(history[history.length - 1].prediction_results.attack_percentage || 0, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Dataset Information */}
                    {history[history.length - 1].classification_report?.dataset_info && (
                      <div className="bg-gray-800 p-5 rounded-xl border border-blue-700 shadow-lg">
                        <h4 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                          <Database className="h-5 w-5 text-blue-400" />
                          <span>Dataset Information</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-blue-900/30 rounded-lg border border-blue-700">
                            <p className="text-2xl font-bold text-blue-300">{history[history.length - 1].classification_report.dataset_info.original_samples}</p>
                            <p className="text-sm font-medium text-gray-300">Original Samples</p>
                          </div>
                          <div className="text-center p-3 bg-green-900/30 rounded-lg border border-green-700">
                            <p className="text-2xl font-bold text-green-300">{history[history.length - 1].classification_report.dataset_info.cleaned_samples}</p>
                            <p className="text-sm font-medium text-gray-300">After Cleaning</p>
                          </div>
                          <div className="text-center p-3 bg-purple-900/30 rounded-lg border border-purple-700">
                            <p className="text-2xl font-bold text-purple-300">{history[history.length - 1].classification_report.dataset_info.final_features}</p>
                            <p className="text-sm font-medium text-gray-300">Features Used</p>
                          </div>
                        </div>
                        {history[history.length - 1].classification_report.dataset_info.outliers_removed > 0 && (
                          <div className="mt-3 p-3 bg-yellow-900/30 rounded-lg border border-yellow-700">
                            <p className="text-sm font-medium text-yellow-300">
                              🔧 Data Preprocessing: Removed {history[history.length - 1].classification_report.dataset_info.outliers_removed} outliers during cleaning
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Test Metadata */}
                    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Execution Time: <strong className="text-white">{typeof history[history.length - 1].execution_time === 'number' ? history[history.length - 1].execution_time.toFixed(2) : Number(history[history.length - 1].execution_time || 0).toFixed(2)}s</strong></span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Dataset: <strong className="text-white">{history[history.length - 1].dataset_filename}</strong></span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4" />
                          <span>Test ID: <strong className="text-white">#{history[history.length - 1].id}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestModels;