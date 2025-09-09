import { Shield, Activity, Database, Brain, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary cyber-glow" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  CyberGuard ML
                </h1>
                <p className="text-sm text-muted-foreground">Network Intrusion Detection System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <Activity className="h-4 w-4 text-success" />
              <span className="text-success">System Active</span>
            </div>
            <Button variant="outline" size="sm">
              <Database className="h-4 w-4 mr-2" />
              UNSW-NB15
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;