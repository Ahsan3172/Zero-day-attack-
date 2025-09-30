import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Brain, Clock, CheckCircle, AlertCircle, Trash2, Loader2, X, Calendar, Target, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/config/api";
import { tokenManager } from "@/services/api";
import type { ClassificationReport } from "@/types";

interface Model {
  id: string | number;
  name: string;
  type: string;
  accuracy: string;
  status: string;
  lastTrained: string;
  description: string;
  performance?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    confusion_matrix?: number[][];
    classification_report?: ClassificationReport;
    feature_importance?: { [key: string]: number };
  };
  path?: string;
}

const Models = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Check if user has admin role
  const isAdmin = user?.role === 'admin';

  // Fetch models from API
  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.saved_models) {
        setModels(data.data.saved_models);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch models';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch models on component mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "training":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "training":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDeleteModel = (modelName: string) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete models",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Model deleted",
      description: `${modelName} has been removed from the system`,
      variant: "destructive"
    });
  };

  const handleModelClick = (model: Model) => {
    setSelectedModel(model);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedModel(null);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading models...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">Error loading models</p>
            <Button onClick={fetchModels} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            Models
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin Features Available
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Monitor machine learning models
            {!isAdmin && " • Contact admin to delete models"}
          </p>
        </div>
      </div>

      {models.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Models Found</h3>
            <p className="text-muted-foreground mb-4">
              No trained models are currently available. Train some models to see them here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {models.map((model) => (
            <Card 
              key={model.id} 
              className="relative cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => handleModelClick(model)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>{model.name}</span>
                  </CardTitle>
                  <Badge className={getStatusColor(model.status)}>
                    {getStatusIcon(model.status)}
                    <span className="ml-1 capitalize">{model.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{model.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <div className="font-medium">{model.type}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Accuracy:</span>
                      <div className="font-medium text-success">{model.accuracy}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Last trained:</span>
                      <div className="font-medium">{model.lastTrained}</div>
                    </div>
                    {model.performance && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Performance:</span>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                          <div>Precision: {(model.performance.precision * 100).toFixed(1)}%</div>
                          <div>Recall: {(model.performance.recall * 100).toFixed(1)}%</div>
                          <div>F1-Score: {(model.performance.f1_score * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {isAdmin && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModel(model.name);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Model Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2">
                <Brain className="h-6 w-6" />
                <span>{selectedModel?.name}</span>
                <Badge className={selectedModel ? getStatusColor(selectedModel.status) : ""}>
                  {selectedModel && getStatusIcon(selectedModel.status)}
                  <span className="ml-1 capitalize">{selectedModel?.status}</span>
                </Badge>
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedModel && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Model Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
                      <p className="text-sm font-medium">{selectedModel.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-sm">{selectedModel.description}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Trained</label>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {selectedModel.lastTrained}
                      </p>
                    </div>
                    {selectedModel.path && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Model Path</label>
                        <p className="text-sm font-mono bg-muted p-2 rounded text-xs break-all">
                          {selectedModel.path}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Metrics */}
                {selectedModel.performance && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Performance Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                        <p className="text-2xl font-bold text-success">
                          {(selectedModel.performance.accuracy * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Precision</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(selectedModel.performance.precision * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">Recall</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {(selectedModel.performance.recall * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">F1-Score</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {(selectedModel.performance.f1_score * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confusion Matrix */}
              {selectedModel.performance?.confusion_matrix && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Confusion Matrix</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-border">
                      <thead>
                        <tr>
                          <th className="border border-border p-2 bg-muted text-sm">Predicted →</th>
                          <th className="border border-border p-2 bg-muted text-sm">Normal</th>
                          <th className="border border-border p-2 bg-muted text-sm">Attack</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th className="border border-border p-2 bg-muted text-sm">Normal</th>
                          <td className="border border-border p-2 text-center font-mono">
                            {selectedModel.performance.confusion_matrix[0][0].toLocaleString()}
                          </td>
                          <td className="border border-border p-2 text-center font-mono">
                            {selectedModel.performance.confusion_matrix[0][1].toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <th className="border border-border p-2 bg-muted text-sm">Attack</th>
                          <td className="border border-border p-2 text-center font-mono">
                            {selectedModel.performance.confusion_matrix[1][0].toLocaleString()}
                          </td>
                          <td className="border border-border p-2 text-center font-mono">
                            {selectedModel.performance.confusion_matrix[1][1].toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Feature Importance */}
              {selectedModel.performance?.feature_importance && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Top Feature Importance</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedModel.performance.feature_importance)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 10)
                      .map(([feature, importance]) => (
                        <div key={feature} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm font-medium">{feature}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-background rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${((importance as number) * 100).toFixed(1)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono min-w-[3rem] text-right">
                              {((importance as number) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Classification Report */}
              {selectedModel.performance?.classification_report && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Classification Report</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-border text-sm">
                      <thead>
                        <tr>
                          <th className="border border-border p-2 bg-muted text-left">Class</th>
                          <th className="border border-border p-2 bg-muted">Precision</th>
                          <th className="border border-border p-2 bg-muted">Recall</th>
                          <th className="border border-border p-2 bg-muted">F1-Score</th>
                          <th className="border border-border p-2 bg-muted">Support</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedModel.performance.classification_report)
                          .filter(([key]) => !['accuracy', 'macro avg', 'weighted avg'].includes(key))
                          .map(([className, metrics]: [string, unknown]) => {
                            const isValidMetrics = typeof metrics === 'object' && metrics && 
                                                  'precision' in metrics && 'recall' in metrics && 
                                                  'f1-score' in metrics && 'support' in metrics;
                            const typedMetrics = metrics as { precision: number; recall: number; 'f1-score': number; support: number };
                            
                            return (
                              <tr key={className}>
                                <td className="border border-border p-2 font-medium">
                                  {className === '0' ? 'Normal' : className === '1' ? 'Attack' : className}
                                </td>
                                <td className="border border-border p-2 text-center font-mono">
                                  {isValidMetrics ? (typedMetrics.precision * 100).toFixed(1) : '0.0'}%
                                </td>
                                <td className="border border-border p-2 text-center font-mono">
                                  {isValidMetrics ? (typedMetrics.recall * 100).toFixed(1) : '0.0'}%
                                </td>
                                <td className="border border-border p-2 text-center font-mono">
                                  {isValidMetrics ? (typedMetrics['f1-score'] * 100).toFixed(1) : '0.0'}%
                                </td>
                                <td className="border border-border p-2 text-center font-mono">
                                  {isValidMetrics ? typedMetrics.support?.toLocaleString() : '0'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Models;