import { fetchWithAuth } from './api';

export interface DashboardStats {
  user_stats: {
    total_tests: number;
    avg_accuracy: number;
    potential_threats: number;
    high_performance: number;
    last_test_date: string | null;
  };
  recent_tests: Array<{
    id: number;
    accuracy: number;
    precision_score: number;
    recall_score: number;
    f1_score: number;
    execution_time: number;
    created_at: string;
    model_name: string;
    algorithm: string;
    dataset_name: string;
  }>;
  active_training: {
    active_jobs: number;
  };
  weekly_activity: Array<{
    date: string;
    tests: number;
    avg_accuracy: number;
  }>;
  system_stats?: {
    total_tests_all: number;
    active_users: number;
    system_avg_accuracy: number;
    system_threats: number;
    tests_this_week: number;
    top_performers: Array<{
      username: string;
      id: number;
      test_count: number;
      avg_accuracy: number;
      last_activity: string;
    }>;
  };
}

export interface ThreatAnalysis {
  threat_distribution: Array<{
    threat_level: string;
    count: number;
    avg_accuracy: number;
  }>;
  algorithm_performance: Array<{
    algorithm: string;
    test_count: number;
    avg_accuracy: number;
    avg_precision: number;
    avg_recall: number;
    avg_f1: number;
    avg_execution_time: number;
  }>;
}

export const dashboardService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetchWithAuth('http://localhost:5000/api/dashboard/stats');
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch dashboard stats');
    }
    return response.data;
  },

  async getThreatAnalysis(): Promise<ThreatAnalysis> {
    const response = await fetchWithAuth('http://localhost:5000/api/dashboard/threats');
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch threat analysis');
    }
    return response.data;
  }
};