import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, TrendingUp, TrendingDown } from "lucide-react";

const SystemReports = () => {
  const stats = [
    {
      title: "Total Scans",
      value: "12,847",
      change: "15% from last week",
      trend: "up",
      color: "text-primary"
    },
    {
      title: "Threats Blocked", 
      value: "1,236",
      change: "8% from last week",
      trend: "down",
      color: "text-success"
    },
    {
      title: "False Positives",
      value: "23", 
      change: "12% from last week",
      trend: "up",
      color: "text-success"
    },
    {
      title: "System Uptime",
      value: "99.9%",
      change: "Excellent",
      trend: "stable",
      color: "text-success"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Reports</h1>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Weekly Performance Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`text-3xl font-bold ${stat.color}`}>
                        {stat.value}
                      </span>
                      {stat.trend === "up" && <TrendingUp className="h-4 w-4 text-success" />}
                      {stat.trend === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                    </div>
                    <p className={`text-sm ${
                      stat.trend === "up" ? "text-success" : 
                      stat.trend === "down" ? "text-destructive" : 
                      "text-muted-foreground"
                    }`}>
                      {stat.change}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Full Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SystemReports;