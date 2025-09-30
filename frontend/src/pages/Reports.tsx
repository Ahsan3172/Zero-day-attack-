import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, FileText, TrendingUp, AlertTriangle, Shield, Eye, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ModelResult {
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
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    results: ModelResult[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const Reports = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const [modelResults, setModelResults] = useState<ModelResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Utility function to make authenticated API calls
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
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
  }, []);

  // Fetch model results from API
  const fetchModelResults = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const data: ApiResponse = await fetchWithAuth(
        `http://localhost:5000/api/models/results?page=${page}&limit=${pagination.limit}`
      );

      console.log('API Response:', data); // Debug log

      if (data.success) {
        console.log('Model results:', data.data.results); // Debug log
        console.log('Full data object:', data.data); // Debug log
        console.log('Results array length:', data.data.results?.length); // Debug log
        setModelResults(data.data.results);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching model results:', error);
      toast({
        title: "Error",
        description: "Failed to load test results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, fetchWithAuth, toast]);

  // Download a specific result
  const handleDownloadResult = async (resultId: number, format: 'pdf' | 'json' = 'json') => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get the result data first
      const response = await fetch(
        `http://localhost:5000/api/models/results/${resultId}/download?format=json`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch result data');
      }

      const resultData = await response.json();
      
      if (format === 'json') {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `test-result-${resultId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Download successful",
          description: "Test result has been downloaded as JSON",
        });
      } else if (format === 'pdf') {
        // Generate PDF content
        await generatePDFReport(resultData, resultId);
        
        toast({
          title: "PDF Generated",
          description: "Test result PDF has been generated and downloaded",
        });
      }
    } catch (error) {
      console.error('Error downloading result:', error);
      toast({
        title: "Download failed",
        description: "Failed to download test result. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate PDF report using HTML and print
  const generatePDFReport = async (resultData: ModelResult, resultId: number) => {
    // Find the specific result for better data access
    const result = modelResults.find(r => r.id === resultId);
    if (!result) {
      throw new Error('Result not found');
    }

    // Helper functions for safe number conversion
    const safeNumber = (value: unknown): number => {
      if (typeof value === 'number') return isNaN(value) ? 0 : value;
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };

    const safePercentage = (value: unknown): string => {
      const num = safeNumber(value);
      return (num * 100).toFixed(2);
    };

    const safeExecutionTime = (value: unknown): string => {
      const num = safeNumber(value);
      return num > 0 ? `${num.toFixed(2)} seconds` : 'N/A';
    };

    // Convert all numeric values safely
    const accuracy = safeNumber(result.accuracy);
    const precision = safeNumber(result.precision_score);
    const recall = safeNumber(result.recall_score);
    const f1Score = safeNumber(result.f1_score);

    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups.');
    }

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Result Report - ${result.model_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .header h1 { 
              color: #2563eb; 
              margin-bottom: 10px;
            }
            .section { 
              margin-bottom: 25px; 
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 8px;
            }
            .section h2 { 
              color: #1f2937; 
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
            }
            .metrics-grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 15px;
              margin-top: 15px;
            }
            .metric-card { 
              padding: 12px; 
              background: #f8fafc; 
              border-radius: 6px;
              border-left: 4px solid #2563eb;
            }
            .metric-label { 
              font-weight: bold; 
              color: #6b7280;
              font-size: 14px;
            }
            .metric-value { 
              font-size: 24px; 
              font-weight: bold; 
              color: #1f2937;
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 8px;
            }
            .info-label { 
              font-weight: bold; 
              color: #6b7280;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Zero Day Attack Detection - Test Result Report</h1>
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>User:</strong> ${user?.username || 'Unknown'}</p>
          </div>

          <div class="section">
            <h2>Test Information</h2>
            <div class="info-row">
              <span class="info-label">Test ID:</span>
              <span>${result.id}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Model Name:</span>
              <span>${result.model_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Algorithm:</span>
              <span>${result.algorithm}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Dataset:</span>
              <span>${result.dataset_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Test Date:</span>
              <span>${formatDate(result.created_at)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Execution Time:</span>
              <span>${safeExecutionTime(result.execution_time)}</span>
            </div>
          </div>

          <div class="section">
            <h2>Performance Metrics</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Accuracy</div>
                <div class="metric-value">${safePercentage(accuracy)}%</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Precision</div>
                <div class="metric-value">${safePercentage(precision)}%</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Recall</div>
                <div class="metric-value">${safePercentage(recall)}%</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">F1 Score</div>
                <div class="metric-value">${safePercentage(f1Score)}%</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Performance Analysis</h2>
            <p><strong>Overall Assessment:</strong></p>
            <p>
              ${accuracy >= 0.95 ? 
                '<strong>Excellent Performance</strong> - This model shows outstanding threat detection capabilities with 95%+ accuracy.' :
                accuracy >= 0.90 ?
                '<strong>Very Good Performance</strong> - Strong threat detection with 90-95% accuracy.' :
                accuracy >= 0.80 ?
                '<strong>Good Performance</strong> - Acceptable threat detection with 80-90% accuracy.' :
                '<strong>Needs Improvement</strong> - Performance below 80% requires optimization.'
              }
            </p>
            
            <p><strong>Key Insights:</strong></p>
            <ul>
              <li><strong>Detection Rate:</strong> ${safePercentage(recall)}% of actual threats were correctly identified</li>
              <li><strong>Precision Rate:</strong> ${safePercentage(precision)}% of positive predictions were correct</li>
              <li><strong>Balanced Score:</strong> F1 score of ${safePercentage(f1Score)}% indicates ${f1Score >= 0.9 ? 'excellent' : f1Score >= 0.8 ? 'good' : 'moderate'} balance</li>
              <li><strong>Algorithm:</strong> ${result.algorithm} was used for this analysis</li>
            </ul>
          </div>

          <div class="section">
            <h2>Security Implications</h2>
            <p><strong>Threat Detection Capability:</strong></p>
            <p>
              This model's ${safePercentage(accuracy)}% accuracy means it can correctly identify 
              ${Math.round(accuracy * 100)} out of every 100 zero-day attack attempts.
            </p>
            
            <p><strong>Recommendations:</strong></p>
            <ul>
              ${accuracy >= 0.95 ? 
                '<li>Model is production-ready for critical security systems</li><li>Can be deployed with confidence in enterprise environments</li>' :
                accuracy >= 0.85 ?
                '<li>Model shows good potential, consider fine-tuning for production</li><li>Monitor performance in staging environment</li>' :
                '<li>Additional training recommended before production deployment</li><li>Consider feature engineering and data augmentation</li>'
              }
              <li>Continue monitoring performance with new threat data</li>
              <li>Regular model retraining recommended as threat landscape evolves</li>
            </ul>
          </div>

          <div class="footer">
            <p>Generated by Zero Day Attack Detection System | Confidential Report</p>
            <p>This report contains sensitive security information - handle with appropriate care</p>
          </div>
        </body>
      </html>
    `;

    // Write content and trigger print
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  // Calculate summary statistics from results
  const calculateStats = () => {
    if (modelResults.length === 0) {
      return {
        totalTests: 0,
        avgAccuracy: '0.0',
        avgRecall: '0.0',
        topModel: 'N/A'
      };
    }

    const totalTests = modelResults.length;
    
    // Safe calculation with proper number handling
    const safeAverage = (values: number[]) => {
      const validValues = values.filter(val => val !== null && val !== undefined && !isNaN(val));
      if (validValues.length === 0) return 0;
      return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    };

    const accuracyValues = modelResults.map(result => parseFloat(result.accuracy?.toString() || '0'));
    const recallValues = modelResults.map(result => parseFloat(result.recall_score?.toString() || '0'));
    
    const avgAccuracy = safeAverage(accuracyValues);
    const avgRecall = safeAverage(recallValues);
    
    // Find the model with highest accuracy
    const topModel = modelResults.reduce((best, current) => {
      const currentAcc = parseFloat(current.accuracy?.toString() || '0');
      const bestAcc = parseFloat(best.accuracy?.toString() || '0');
      return currentAcc > bestAcc ? current : best;
    });

    return {
      totalTests,
      avgAccuracy: (avgAccuracy * 100).toFixed(1),
      avgRecall: (avgRecall * 100).toFixed(1),
      topModel: topModel.algorithm || 'N/A'
    };
  };

  // Prepare chart data for performance distribution
  const getPerformanceData = () => {
    if (modelResults.length === 0) return [];
    
    return modelResults.map((result, index) => ({
      name: `Test ${index + 1}`,
      model: result.model_name,
      accuracy: ((result.accuracy || 0) * 100),
      precision: ((result.precision_score || 0) * 100),
      recall: ((result.recall_score || 0) * 100),
      f1Score: ((result.f1_score || 0) * 100)
    }));
  };

  // Prepare algorithm comparison data
  const getAlgorithmData = () => {
    if (modelResults.length === 0) return [];
    
    // Group results by algorithm
    const algorithmGroups = modelResults.reduce((acc, result) => {
      const algo = result.algorithm || 'Unknown';
      if (!acc[algo]) {
        acc[algo] = [];
      }
      acc[algo].push(result);
      return acc;
    }, {} as { [key: string]: ModelResult[] });

    // Calculate average metrics for each algorithm
    return Object.entries(algorithmGroups).map(([algorithm, results]) => {
      const avgAccuracy = results.reduce((sum, r) => sum + (r.accuracy || 0), 0) / results.length;
      const avgPrecision = results.reduce((sum, r) => sum + (r.precision_score || 0), 0) / results.length;
      const avgRecall = results.reduce((sum, r) => sum + (r.recall_score || 0), 0) / results.length;
      const avgF1 = results.reduce((sum, r) => sum + (r.f1_score || 0), 0) / results.length;
      
      return {
        name: algorithm,
        accuracy: (avgAccuracy * 100),
        precision: (avgPrecision * 100),
        recall: (avgRecall * 100),
        f1Score: (avgF1 * 100),
        count: results.length
      };
    });
  };

  // Colors for charts
  const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Load data on component mount
  useEffect(() => {
    console.log('useEffect triggered, user:', user); // Debug log
    if (user) {
      console.log('Fetching model results for user:', user.username, user.id); // Debug log
      fetchModelResults(1);
    }
  }, [user, fetchModelResults]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = calculateStats();
  const performanceData = getPerformanceData();
  const algorithmData = getAlgorithmData();

  if (!user) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to view your test reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Your personalized security testing results and model performance analytics</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            className="w-full sm:w-auto" 
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{stats.totalTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                <p className="text-2xl font-bold">{stats.avgAccuracy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-8 w-8 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Top Model</p>
                <p className="text-lg font-bold text-sm">{stats.topModel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {modelResults.length === 0 ? (
              <div className="h-64 md:h-80 flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center space-y-2">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">No data available</p>
                  <p className="text-sm text-muted-foreground">Run some tests to see performance analytics</p>
                </div>
              </div>
            ) : (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={performanceData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                      labelFormatter={(label) => `Test: ${label}`}
                    />
                    <Bar dataKey="accuracy" fill="#2563eb" name="Accuracy" />
                    <Bar dataKey="precision" fill="#10b981" name="Precision" />
                    <Bar dataKey="recall" fill="#f59e0b" name="Recall" />
                    <Bar dataKey="f1Score" fill="#ef4444" name="F1 Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Algorithm Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {algorithmData.length === 0 ? (
              <div className="h-64 md:h-80 flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center space-y-2">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">No algorithm data available</p>
                  <p className="text-sm text-muted-foreground">Test different algorithms to compare performance</p>
                </div>
              </div>
            ) : algorithmData.length === 1 ? (
              <div className="h-64 md:h-80 flex flex-col items-center justify-center">
                <div className="w-full flex items-center justify-center" style={{height: '70%'}}>
                  <ResponsiveContainer width="80%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="accuracy"
                        data={[
                          { name: 'Accuracy', value: algorithmData[0].accuracy, fill: '#2563eb' },
                          { name: 'Precision', value: algorithmData[0].precision, fill: '#10b981' },
                          { name: 'Recall', value: algorithmData[0].recall, fill: '#f59e0b' },
                          { name: 'F1 Score', value: algorithmData[0].f1Score, fill: '#ef4444' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${typeof value === 'number' ? value.toFixed(1) : '0.0'}%`}
                        outerRadius={80}
                        fill="#8884d8"
                      >
                        {[
                          { name: 'Accuracy', value: algorithmData[0].accuracy, fill: '#2563eb' },
                          { name: 'Precision', value: algorithmData[0].precision, fill: '#10b981' },
                          { name: 'Recall', value: algorithmData[0].recall, fill: '#f59e0b' },
                          { name: 'F1 Score', value: algorithmData[0].f1Score, fill: '#ef4444' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full flex flex-col items-center mt-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm mb-1 shadow">
                    Performance metrics for <span className="font-bold">{algorithmData[0].name}</span> algorithm
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs shadow">
                    Based on <span className="font-bold">{algorithmData[0].count}</span> test{algorithmData[0].count > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={algorithmData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                      labelFormatter={(label) => `Algorithm: ${label}`}
                    />
                    <Bar dataKey="accuracy" fill="#2563eb" name="Accuracy" />
                    <Bar dataKey="precision" fill="#10b981" name="Precision" />
                    <Bar dataKey="recall" fill="#f59e0b" name="Recall" />
                    <Bar dataKey="f1Score" fill="#ef4444" name="F1 Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Your Test Results</span>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading your test results...</span>
            </div>
          ) : modelResults.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Test Results Found</h3>
              <p className="text-muted-foreground">
                You haven't run any tests yet. Start by uploading a dataset and training a model.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {modelResults.map((result) => (
                <div key={result.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg space-y-4 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">{result.model_name}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-muted-foreground space-y-1 sm:space-y-0">
                        <span>Algorithm: {result.algorithm}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Dataset: {result.dataset_name}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{formatDate(result.created_at)}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-muted-foreground space-y-1 sm:space-y-0 mt-1">
                        <span>Accuracy: {((result.accuracy || 0) * 100).toFixed(2)}%</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Precision: {((result.precision_score || 0) * 100).toFixed(2)}%</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Recall: {((result.recall_score || 0) * 100).toFixed(2)}%</span>
                        <span className="hidden sm:inline">•</span>
                        <span>F1: {((result.f1_score || 0) * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-success text-success-foreground">
                      Completed
                    </Badge>
                    <Button 
                      onClick={() => handleDownloadResult(result.id, 'json')}
                      className="h-9 px-3 border-2 border-blue-500 bg-white text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      JSON
                    </Button>
                    <Button 
                      onClick={() => handleDownloadResult(result.id, 'pdf')}
                      className="h-9 px-3 border-2 border-green-500 bg-white text-green-600 hover:bg-green-50 font-medium transition-colors"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </p>
                  <div className="flex space-x-2">
                    <Button 
                      disabled={pagination.page <= 1}
                      onClick={() => fetchModelResults(pagination.page - 1)}
                      className="h-9 px-3 border-2 border-gray-600 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400"
                    >
                      Previous
                    </Button>
                    <Button 
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchModelResults(pagination.page + 1)}
                      className="h-9 px-3 border-2 border-gray-600 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400"
                    >
                      Next
                    </Button>
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

export default Reports;