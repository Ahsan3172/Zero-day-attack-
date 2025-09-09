import { useState, useCallback } from "react";
import { Wifi, Database, Play, Globe, Activity, Network, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const DataUpload = () => {
  const [dataSource, setDataSource] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleStartAnalysis = () => {
    if (!dataSource) {
      toast({
        title: "Select Network Source",
        description: "Please select a network source before starting analysis",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    toast({
      title: "Network Analysis Started",
      description: `Running Random Forest threat detection on ${dataSource} network traffic`,
    });

    // Simulate analysis process
    setTimeout(() => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Active",
        description: "Real-time threat detection is now running",
      });
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Network Traffic Source</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-medium">Choose Network Source</label>
          <Select value={dataSource} onValueChange={setDataSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select network source for real-time analysis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Live Network Interface</span>
                </div>
              </SelectItem>
              <SelectItem value="pcap">
                <div className="flex items-center space-x-2">
                  <Network className="h-4 w-4" />
                  <span>Network Packet Capture</span>
                </div>
              </SelectItem>
              <SelectItem value="remote">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Remote Network Monitoring</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Configuration Panel */}
        {dataSource && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border-l-4 border-l-primary">
            <div className="space-y-4">
              {dataSource === 'realtime' && (
                <div>
                  <h4 className="font-medium mb-2">Live Network Interface Configuration</h4>
                  <div className="space-y-2">
                    <select className="w-full p-2 border border-border rounded-md bg-background">
                      <option>Select Network Interface</option>
                      <option>eth0 (192.168.1.100)</option>
                      <option>wlan0 (192.168.1.101)</option>
                      <option>lo (127.0.0.1)</option>
                    </select>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="promiscuous" className="rounded" />
                      <label htmlFor="promiscuous" className="text-sm">Enable promiscuous mode</label>
                    </div>
                  </div>
                </div>
              )}
              
              {dataSource === 'pcap' && (
                <div>
                  <h4 className="font-medium mb-2">Network Packet Capture</h4>
                  <div className="space-y-2">
                    <select className="w-full p-2 border border-border rounded-md bg-background">
                      <option>Select Interface to Capture</option>
                      <option>eth0 - Ethernet Interface</option>
                      <option>wlan0 - Wireless Interface</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Capture duration (seconds)"
                      className="w-full p-2 border border-border rounded-md bg-background"
                    />
                  </div>
                </div>
              )}
              
              {dataSource === 'remote' && (
                <div>
                  <h4 className="font-medium mb-2">Remote Network Monitoring</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Remote IP Address (e.g., 192.168.1.50)"
                      className="w-full p-2 border border-border rounded-md bg-background"
                    />
                    <input
                      type="number"
                      placeholder="SSH Port (default: 22)"
                      className="w-full p-2 border border-border rounded-md bg-background"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {dataSource && (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Using pre-trained Random Forest Classifier for threat detection</span>
            </div>
            <Button 
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="w-full cyber-glow"
            >
              <Play className="h-4 w-4 mr-2" />
              {isAnalyzing ? "Starting Analysis..." : "Start Real-Time Analysis"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataUpload;