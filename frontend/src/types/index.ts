// Type definitions for the Zero Day Attack Detection System

// Pagination type
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Dataset info structure
export interface DatasetInfo {
  original_samples: number;
  cleaned_samples: number;
  final_features: number;
  outliers_removed: number;
}

// Classification report structure
export interface ClassificationReport {
  [className: string]: {
    precision: number;
    recall: number;
    'f1-score': number;
    support: number;
  } | number; // macro avg, weighted avg values are numbers
}



// Classification report with dataset info as a separate type
export type ClassificationReportWithDataset = ClassificationReport & {
  dataset_info?: DatasetInfo;
}

// API Error type
export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

// Recent activity types
export interface ActivityLog {
  id: number;
  user: string;
  action: string;
  timestamp: string;
  details?: string;
}

// Training log entry
export interface TrainingLog {
  id: number;
  timestamp: string;
  epoch?: number;
  loss?: number;
  accuracy?: number;
  message: string;
  level: 'info' | 'warning' | 'error';
}

// Model prediction result
export interface PredictionResult {
  id: number;
  model_id: number;
  dataset_id: number;
  predictions: number[];
  confidence_scores: number[];
  anomaly_count: number;
  normal_count: number;
  created_at: string;
}

// Prediction results with statistics
export interface PredictionResults {
  predictions: number[];
  probabilities?: number[][];
  total_predictions?: number;
  attacks_detected?: number;
  normal_detected?: number;
  attack_percentage?: number;
}

// Model result with classification report and prediction results
export interface ModelResult {
  id: number;
  model_name: string;
  dataset_name: string;
  accuracy: number;
  precision_score: number;
  recall_score: number;
  f1_score: number;
  confusion_matrix: number[][];
  classification_report: ClassificationReportWithDataset;
  prediction_results: PredictionResults;
  execution_time: number;
  created_at: string;
  training_time?: number;
  status: string;
}

// Dashboard chart data
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// System statistics
export interface SystemStats {
  total_users: number;
  active_models: number;
  datasets_processed: number;
  predictions_made: number;
  accuracy_average: number;
  last_updated: string;
}

// Audit log entry
export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  resource: string;
  resource_id?: number;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

// Generic API list response
export interface ApiListResponse<T> {
  users: T[];
  pagination: Pagination;
}

// Training request data
export interface TrainingRequest {
  model_types: string[];
  test_size?: number;
  random_state?: number;
  dataset_path?: string | null;
}

// Training status response
export interface TrainingStatus {
  task_id: string;
  status: string;
  progress: number;
  message: string;
  current_model?: string;
  models_completed: string[] | { [modelName: string]: { accuracy?: number } };
  error_details?: string;
}

// User invitation data
export interface UserInvitation {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

// Model training data for admin
export interface ModelTrainingData {
  name: string;
  description: string;
  algorithm: string;
  datasetId: number;
}

// Role update response
export interface RoleUpdateResponse {
  userId: number;
  newRole: string;
}