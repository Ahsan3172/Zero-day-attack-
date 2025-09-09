import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Settings
} from "lucide-react";

const Dashboard = () => {
  const recentAlerts = [
    { id: 1, type: 'High', threat: 'Suspicious Network Activity', time: '2 min ago', status: 'active' },
    { id: 2, type: 'Medium', threat: 'Unusual Login Pattern', time: '15 min ago', status: 'investigating' },
    { id: 3, type: 'Low', threat: 'Port Scan Detected', time: '1 hour ago', status: 'resolved' },
    { id: 4, type: 'High', threat: 'Malware Signature Match', time: '2 hours ago', status: 'blocked' }
  ];

  const kpiCards = [
    {
      title: "Active Threats",
      value: "23",
      change: "-8%",
      trend: "down",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
    {
      title: "Systems Protected",
      value: "1,247",
      change: "+12%",
      trend: "up", 
      icon: Shield,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Detection Accuracy",
      value: "99.7%",
      change: "+0.3%",
      trend: "up",
      icon: CheckCircle,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Response Time",
      value: "1.2s",
      change: "-15%",
      trend: "down",
      icon: Activity,
      color: "text-accent",
      bgColor: "bg-accent/10"
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Security Dashboard</h1>
          <p className="text-muted-foreground">Real-time threat detection and system monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="cyber-glow">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`text-2xl md:text-3xl font-bold ${kpi.color}`}>
                      {kpi.value}
                    </span>
                    {kpi.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <p className="text-sm text-success">{kpi.change} from last week</p>
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
            <div className="h-64 md:h-80 flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center space-y-2">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Interactive chart data visualization</p>
                <p className="text-sm text-muted-foreground">Connect to backend for real-time data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Threat Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Threat Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80 flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center space-y-2">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Threat analytics visualization</p>
                <p className="text-sm text-muted-foreground">Connect to backend for live threat data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts and System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Alerts
              </span>
              <Button variant="outline" size="sm">View All</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-4">
                    <Badge 
                      variant={alert.type === 'High' ? 'destructive' : alert.type === 'Medium' ? 'default' : 'secondary'}
                    >
                      {alert.type}
                    </Badge>
                    <div>
                      <p className="font-medium text-foreground">{alert.threat}</p>
                      <p className="text-sm text-muted-foreground">{alert.time}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      alert.status === 'active' ? 'text-destructive border-destructive' :
                      alert.status === 'resolved' ? 'text-success border-success' :
                      'text-warning border-warning'
                    }
                  >
                    {alert.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">CPU Usage</span>
                <span className="text-sm font-medium">45%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{width: "45%"}}></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Memory Usage</span>
                <span className="text-sm font-medium">67%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-warning h-2 rounded-full" style={{width: "67%"}}></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Network Load</span>
                <span className="text-sm font-medium">23%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{width: "23%"}}></div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">System Uptime</span>
                <span className="text-sm font-medium text-success">99.9%</span>
              </div>
            </div>

            <Button className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;