import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Activity, Wifi, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NetworkAlert {
  id: string;
  timestamp: string;
  type: "normal" | "suspicious" | "malicious";
  source: string;
  description: string;
  confidence: number;
}

const NetworkMonitor = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<NetworkAlert[]>([]);
  const [stats, setStats] = useState({
    totalPackets: 0,
    threats: 0,
    normal: 0,
  });

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        // Simulate network activity
        setStats(prev => ({
          totalPackets: prev.totalPackets + Math.floor(Math.random() * 10),
          threats: prev.threats + (Math.random() > 0.95 ? 1 : 0),
          normal: prev.normal + Math.floor(Math.random() * 8),
        }));

        // Occasionally add new alerts using Random Forest predictions
        if (Math.random() > 0.9) {
          const alertTypes = ["malicious", "suspicious", "normal"];
          const alertDescriptions = [
            "Random Forest: DDoS attack pattern detected",
            "Random Forest: Port scan activity identified", 
            "Random Forest: Suspicious data exfiltration",
            "Random Forest: Normal traffic pattern",
            "Random Forest: Potential botnet communication",
          ];
          
          const newAlert: NetworkAlert = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            type: Math.random() > 0.8 ? "malicious" : Math.random() > 0.6 ? "suspicious" : "normal",
            source: `192.168.1.${Math.floor(Math.random() * 255)}`,
            description: alertDescriptions[Math.floor(Math.random() * alertDescriptions.length)],
            confidence: Math.floor(Math.random() * 30) + 70, // RF model confidence 70-100%
          };
          
          setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const getAlertColor = (type: string) => {
    switch (type) {
      case "malicious": return "text-destructive";
      case "suspicious": return "text-warning";
      default: return "text-success";
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case "malicious": return "destructive";
      case "suspicious": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Threat Detection Monitor</span>
          </div>
          <Button
            onClick={() => setIsMonitoring(!isMonitoring)}
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
            className="cyber-glow"
          >
            {isMonitoring ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Stop Monitor
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Start Monitor
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.totalPackets}</div>
            <div className="text-xs text-muted-foreground">Total Packets</div>
          </div>
          <div className="text-center p-3 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{stats.normal}</div>
            <div className="text-xs text-muted-foreground">Normal Traffic</div>
          </div>
          <div className="text-center p-3 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{stats.threats}</div>
            <div className="text-xs text-muted-foreground">Threats Detected</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Recent Alerts</span>
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isMonitoring ? "Monitoring network traffic..." : "Start monitoring to see alerts"}
              </p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded border-l-2 border-l-primary"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getAlertBadge(alert.type) as "default" | "secondary" | "destructive" | "outline"}>
                        {alert.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                    </div>
                    <p className="text-sm mt-1">{alert.description}</p>
                    <p className="text-xs text-muted-foreground">Source: {alert.source}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getAlertColor(alert.type)}`}>
                      {alert.confidence}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkMonitor;