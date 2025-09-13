import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, AlertCircle, CheckCircle, FileText, BarChart3, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const TestModels = () => {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<ModelTestResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const { toast } = useToast();

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

    setIsLoading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model_name", selectedModel);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Test Trained Models</h1>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Select Trained Model</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingModels ? (
            <div className="text-center py-4 text-gray-700 font-medium">Loading available models...</div>
          ) : models.length > 0 ? (
            <select
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="" className="text-gray-500">-- Select a trained model --</option>
              {models.map((model) => (
                <option key={model} value={model} className="text-gray-900">
                  {model.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No trained models found</p>
              <p className="text-sm">Please train some models first</p>
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
    </div>
  );
};

export default TestModels;