import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, FileText, TrendingUp, AlertTriangle, Shield, Eye } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("7days");

  const threatData = [
    { name: "Malware", detected: 450, blocked: 448, color: "#ef4444" },
    { name: "Phishing", detected: 320, blocked: 318, color: "#f97316" },
    { name: "DDoS", detected: 180, blocked: 178, color: "#eab308" },
    { name: "Intrusion", detected: 95, blocked: 92, color: "#84cc16" },
    { name: "Zero-day", detected: 12, blocked: 10, color: "#06b6d4" }
  ];

  const performanceData = [
    { date: "Jan 10", accuracy: 94.2, precision: 92.8, recall: 95.1 },
    { date: "Jan 11", accuracy: 95.1, precision: 93.5, recall: 96.2 },
    { date: "Jan 12", accuracy: 93.8, precision: 91.9, recall: 94.8 },
    { date: "Jan 13", accuracy: 96.3, precision: 95.2, recall: 97.1 },
    { date: "Jan 14", accuracy: 95.7, precision: 94.1, recall: 96.8 },
    { date: "Jan 15", accuracy: 97.2, precision: 96.5, recall: 98.0 }
  ];

  const reports = [
    {
      id: 1,
      title: "Weekly Security Analysis",
      type: "Security Report",
      date: "2024-01-15",
      status: "completed",
      threats: 127,
      accuracy: "96.8%"
    },
    {
      id: 2,
      title: "Model Performance Review",
      type: "Performance Report", 
      date: "2024-01-14",
      status: "completed",
      threats: 89,
      accuracy: "94.2%"
    },
    {
      id: 3,
      title: "Zero-day Detection Summary",
      type: "Threat Intelligence",
      date: "2024-01-13",
      status: "processing",
      threats: 12,
      accuracy: "92.1%"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "processing":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleExportReport = (reportTitle: string) => {
    toast({
      title: "Report exported",
      description: `${reportTitle} has been exported successfully`,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive security reports and model performance analytics</p>
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
          <Button className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Threats Blocked</p>
                <p className="text-2xl font-bold">1,046</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Total Threats</p>
                <p className="text-2xl font-bold">1,057</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Detection Rate</p>
                <p className="text-2xl font-bold">98.9%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="h-8 w-8 text-info" />
              <div>
                <p className="text-sm text-muted-foreground">False Positives</p>
                <p className="text-2xl font-bold">11</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Threat Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80 flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center space-y-2">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Threat distribution analytics</p>
                <p className="text-sm text-muted-foreground">Connect to backend for live data visualization</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80 flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center space-y-2">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Performance analytics visualization</p>
                <p className="text-sm text-muted-foreground">Connect to backend for model metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Recent Reports</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{report.title}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-muted-foreground space-y-1 sm:space-y-0">
                      <span>{report.type}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{report.date}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{report.threats} threats analyzed</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{report.accuracy} accuracy</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                  {report.status === "completed" && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleExportReport(report.title)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;