import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Download, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { tokenManager } from '@/services/api';

interface TrainingJob {
  id: number;
  task_id: string;
  user_id: number;
  dataset_path: string;
  model_types: string[]; // JSON field containing array of model types
  test_size: number;
  random_state: number;
  status: string;
  progress?: number;
  current_model?: string;
  message?: string;
  error_details?: string;
  models_completed?: string[]; // JSON field containing array of completed models
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  created_by?: string; // from JOIN with users table
  error_message?: string;
}

export function TrainingHistory() {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTrainingJobs = useCallback(async () => {
    try {
      const token = tokenManager.getToken();
      console.log('Token available:', !!token);
      
      const response = await fetch('/api/models/training-history', {
        headers: {
          ...tokenManager.getAuthHeaders()
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Training history response:', data);
        
        // Handle both response formats: direct array or { success: true, data: [...] }
        if (data.success && Array.isArray(data.data)) {
          setJobs(data.data);
        } else if (Array.isArray(data)) {
          setJobs(data);
        } else {
          console.error('Unexpected response format:', data);
          setJobs([]);
        }
      } else {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        toast({
          title: "Error",
          description: `Failed to fetch training history: ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching training jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch training history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteTrainingJob = async (jobId: number) => {
    if (!user?.role || !['admin', 'super_admin'].includes(user.role)) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete training jobs",
        variant: "destructive"
      });
      return;
    }

    setDeleting(jobId);
    try {
      const response = await fetch(`/api/models/training/${jobId}`, {
        method: 'DELETE',
        headers: {
          ...tokenManager.getAuthHeaders()
        }
      });

      if (response.ok) {
        setJobs(jobs.filter(job => job.id !== jobId));
        toast({
          title: "Success",
          description: "Training job deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete training job",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting training job:', error);
      toast({
        title: "Error",
        description: "Failed to delete training job",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const downloadModel = async (job: TrainingJob) => {
    if (!job.models_completed) {
      toast({
        title: "Error",
        description: "No completed models available for download",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/models/download/${job.id}`, {
        headers: {
          ...tokenManager.getAuthHeaders()
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${job.current_model || 'model'}_${job.id}.pkl`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Success",
          description: "Model downloaded successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to download model",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error downloading model:', error);
      toast({
        title: "Error",
        description: "Failed to download model",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
      case 'started':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'in_progress':
      case 'started':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'cancelled':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatMetric = (value: number) => {
    return (value * 100).toFixed(2) + '%';
  };

  useEffect(() => {
    if (user) {
      fetchTrainingJobs();
    } else {
      setLoading(false);
    }
  }, [user, fetchTrainingJobs]);

  if (loading || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Training History</CardTitle>
          <CardDescription>Loading training history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Training History</CardTitle>
            <CardDescription>
              View and manage your model training history
            </CardDescription>
          </div>
          <Button 
            onClick={fetchTrainingJobs}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!Array.isArray(jobs) ? (
          <div className="text-center py-8 text-muted-foreground">
            Error loading training jobs. Please try again.
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No training jobs found. Start training a model to see your history here.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="border border-border">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(job.status)}
                        <h3 className="font-semibold text-lg">
                          {job.current_model || `Training Job #${job.id}`}
                        </h3>
                        <Badge 
                          className={getStatusBadge(job.status)}
                        >
                          {job.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Task ID: {job.task_id} | Created: {formatDate(job.created_at)}
                      </p>
                      {job.completed_at && (
                        <p className="text-sm text-muted-foreground">
                          Completed: {formatDate(job.completed_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {job.status === 'completed' && job.models_completed && (
                        <Button
                          onClick={() => downloadModel(job)}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      {user?.role && ['admin', 'super_admin'].includes(user.role) && (
                        <Button
                          onClick={() => deleteTrainingJob(job.id)}
                          variant="destructive"
                          size="sm"
                          disabled={deleting === job.id}
                        >
                          {deleting === job.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {job.status === 'in_progress' && job.progress !== undefined && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {job.error_message && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {job.error_message}
                      </p>
                    </div>
                  )}

                  {job.models_completed && typeof job.models_completed === 'object' && !Array.isArray(job.models_completed) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {Object.entries(job.models_completed).map(([modelName, modelData]) => (
                        <div key={modelName} className="text-center p-2 bg-muted rounded-md">
                          <div className="text-sm font-semibold">{modelName}</div>
                          {typeof modelData === 'object' && modelData && 'accuracy' in modelData && (
                            <div className="text-xs text-muted-foreground">
                              Acc: {((modelData as { accuracy: number }).accuracy * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {job.models_completed && Array.isArray(job.models_completed) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {job.models_completed.map((modelName: string) => (
                        <div key={modelName} className="text-center p-2 bg-muted rounded-md">
                          <div className="text-sm font-semibold">{modelName}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {job.message && (
                    <div className="text-sm text-muted-foreground mb-2">
                      Status: {job.message}
                    </div>
                  )}

                  {job.models_completed && (
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <div>Models Completed: {JSON.stringify(job.models_completed)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
