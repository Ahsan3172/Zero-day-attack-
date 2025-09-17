import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardService, DashboardStats, ThreatAnalysis } from "@/services/dashboardService";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Users,
  Brain,
  Download,
  RefreshCw,
  Settings,
  Target,
  Zap,
  Clock
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [threatData, setThreatData] = useState<ThreatAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [statsData, threatsData] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getThreatAnalysis()
      ]);
      
      setDashboardData(statsData);
      setThreatData(threatsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const downloadReport = async () => {
    try {
      toast({
        title: "Generating Report",
        description: "Your dashboard report is being generated...",
      });
      // TODO: Implement report generation
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No data available</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { user_stats, recent_tests, active_training, weekly_activity, system_stats } = dashboardData;
  
  // Helper functions for safe number conversion
  const safeNumber = (value: any): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const safeInteger = (value: any): number => {
    const num = parseInt(value);
    return isNaN(num) ? 0 : num;
  };

  // Convert values to numbers for calculations
  const avgAccuracy = safeNumber(user_stats.avg_accuracy);
  const totalTests = safeInteger(user_stats.total_tests);
  const potentialThreats = safeInteger(user_stats.potential_threats);
  
  // Calculate trend for accuracy
  const accuracyTrend = weekly_activity.length > 1 ? 
    safeNumber(weekly_activity[0]?.avg_accuracy) - safeNumber(weekly_activity[1]?.avg_accuracy) : 0;

  const kpiCards = [
    {
      title: "Total Tests",
      value: totalTests.toString(),
      change: weekly_activity.length > 0 ? `${weekly_activity.reduce((sum, day) => sum + safeInteger(day.tests), 0)} this week` : "0 this week",
      trend: weekly_activity.reduce((sum, day) => sum + safeInteger(day.tests), 0) > 0 ? "up" : "neutral",
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Threats",
      value: potentialThreats.toString(),
      change: totalTests > 0 ? `${((potentialThreats / totalTests) * 100).toFixed(1)}% of tests` : "0%",
      trend: potentialThreats > 0 ? "up" : "down",
      icon: AlertTriangle,
      color: potentialThreats > 0 ? "text-red-600" : "text-green-600",
      bgColor: potentialThreats > 0 ? "bg-red-100" : "bg-green-100"
    },
    {
      title: "Avg Accuracy",
      value: `${avgAccuracy.toFixed(1)}%`,
      change: accuracyTrend !== 0 ? `${accuracyTrend > 0 ? '+' : ''}${accuracyTrend.toFixed(1)}% trend` : "No trend data",
      trend: accuracyTrend >= 0 ? "up" : "down",
      icon: CheckCircle,
      color: avgAccuracy >= 90 ? "text-green-600" : avgAccuracy >= 80 ? "text-yellow-600" : "text-red-600",
      bgColor: avgAccuracy >= 90 ? "bg-green-100" : avgAccuracy >= 80 ? "bg-yellow-100" : "bg-red-100"
    }
  ];

  // If user is admin, show system-wide stats
  if (user?.role === 'admin' && system_stats) {
    kpiCards.push({
      title: "System Users",
      value: safeInteger(system_stats.active_users).toString(),
      change: `${safeInteger(system_stats.total_tests_all)} total tests`,
      trend: "up",
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100"
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {user?.role === 'admin' ? 'System Dashboard' : 'My Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'admin' 
              ? 'System-wide threat detection and monitoring' 
              : 'Your personal ML model testing results and insights'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`text-2xl md:text-3xl font-bold ${kpi.color}`}>
                      {kpi.value}
                    </span>
                    {kpi.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : kpi.trend === "down" ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{kpi.change}</p>
                </div>
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weekly_activity.length > 0 ? (
                weekly_activity.map((day, index) => {
                  const dayAccuracy = safeNumber(day.avg_accuracy);
                  const dayTests = safeInteger(day.tests);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                      <div>
                        <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">{dayTests} tests performed</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          dayAccuracy >= 90 ? 'text-green-600' : 
                          dayAccuracy >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {dayAccuracy.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">avg accuracy</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-32 flex items-center justify-center text-center">
                  <div className="space-y-2">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">No activity this week</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Threat Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Threat Detection Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {threatData?.threat_distribution && threatData.threat_distribution.length > 0 ? (
                threatData.threat_distribution.map((threat, index) => {
                  const threatAccuracy = safeNumber(threat.avg_accuracy);
                  const threatCount = safeInteger(threat.count);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          threat.threat_level === 'Excellent' ? 'default' :
                          threat.threat_level === 'Very Good' ? 'secondary' :
                          threat.threat_level === 'Good' ? 'outline' :
                          threat.threat_level === 'Fair' ? 'secondary' : 'destructive'
                        }>
                          {threat.threat_level}
                        </Badge>
                        <span className="font-medium">{threatCount} tests</span>
                      </div>
                      <span className={`font-semibold ${
                        threatAccuracy >= 90 ? 'text-green-600' : 
                        threatAccuracy >= 80 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {threatAccuracy.toFixed(1)}%
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="h-32 flex items-center justify-center text-center">
                  <div className="space-y-2">
                    <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">No threat analysis data available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tests and System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tests */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Recent Test Results
              </span>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/reports'}>
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent_tests && recent_tests.length > 0 ? (
                recent_tests.map((test) => {
                  const testAccuracy = safeNumber(test.accuracy);
                  const testF1 = safeNumber(test.f1_score);
                  const testExecTime = safeNumber(test.execution_time);
                  return (
                    <div key={test.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-4">
                        <Badge variant={
                          testAccuracy >= 95 ? 'default' :
                          testAccuracy >= 90 ? 'secondary' :
                          testAccuracy >= 80 ? 'outline' : 'destructive'
                        }>
                          {testAccuracy.toFixed(1)}%
                        </Badge>
                        <div>
                          <p className="font-medium text-foreground">{test.model_name} - {test.algorithm}</p>
                          <p className="text-sm text-muted-foreground">
                            {test.dataset_name} • {new Date(test.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">F1: {testF1 > 0 ? testF1.toFixed(2) : 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">
                          {testExecTime > 0 ? `${testExecTime.toFixed(2)}s` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No test results yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-2" 
                    onClick={() => window.location.href = '/test-models'}
                  >
                    Start Testing Models
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Algorithm Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Algorithm Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {threatData?.algorithm_performance && threatData.algorithm_performance.length > 0 ? (
              threatData.algorithm_performance.map((algo, index) => {
                const algoAccuracy = safeNumber(algo.avg_accuracy);
                const algoTestCount = safeInteger(algo.test_count);
                const algoF1 = safeNumber(algo.avg_f1);
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{algo.algorithm}</span>
                      <span className="text-sm font-semibold text-primary">
                        {algoAccuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{width: `${Math.min(algoAccuracy, 100)}%`}}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{algoTestCount} tests</span>
                      <span>F1: {algoF1.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Settings className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No algorithm data available</p>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Active Training Jobs</span>
                <span className="text-sm font-medium">
                  {active_training?.active_jobs || 0}
                </span>
              </div>
              {user_stats.last_test_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Test</span>
                  <span className="text-sm font-medium">
                    {new Date(user_stats.last_test_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin System Stats */}
      {user?.role === 'admin' && system_stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Overview (Admin)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{safeInteger(system_stats.total_tests_all)}</div>
                <div className="text-sm text-muted-foreground">Total System Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{safeInteger(system_stats.active_users)}</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {safeNumber(system_stats.system_avg_accuracy).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">System Avg Accuracy</div>
              </div>
            </div>
            
            {system_stats.top_performers && system_stats.top_performers.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Top Performers</h4>
                <div className="space-y-2">
                  {system_stats.top_performers.map((performer, index) => (
                    <div key={performer.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm w-6">#{index + 1}</span>
                        <span className="font-medium">{performer.username}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">
                          {safeNumber(performer.avg_accuracy).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {safeInteger(performer.test_count)} tests
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;