import { useState } from "react";
import { Scale, TrendingUp, RefreshCw, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const SMOTEAnalysis = () => {
  const [isApplying, setIsApplying] = useState(false);
  const [smoteApplied, setSmoteApplied] = useState(false);
  const [progress, setProgress] = useState(0);

  const classDistribution = {
    before: { normal: 87432, malicious: 2186 },
    after: { normal: 87432, malicious: 43716 }
  };

  const performanceMetrics = {
    before: { accuracy: 94.2, precision: 89.3, recall: 76.8, f1: 82.6 },
    after: { accuracy: 96.8, precision: 95.2, recall: 94.7, f1: 94.9 }
  };

  const applySMOTE = () => {
    setIsApplying(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsApplying(false);
          setSmoteApplied(true);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 300);
  };

  const resetSMOTE = () => {
    setSmoteApplied(false);
    setProgress(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Scale className="h-5 w-5" />
          <span>SMOTE Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Class Balancing</h4>
            <p className="text-xs text-muted-foreground">
              Handle imbalanced dataset using SMOTE technique
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={applySMOTE}
              disabled={isApplying || smoteApplied}
              size="sm"
              className="cyber-glow"
            >
              {isApplying ? "Applying..." : smoteApplied ? "Applied" : "Apply SMOTE"}
            </Button>
            {smoteApplied && (
              <Button
                onClick={resetSMOTE}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isApplying && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Synthesizing minority samples...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <h5 className="text-sm font-medium flex items-center space-x-2">
              <BarChart className="h-4 w-4" />
              <span>Class Distribution</span>
            </h5>
            
            <div className="space-y-2">
              <div className="p-3 bg-muted/30 rounded-lg">
                <h6 className="text-xs font-medium mb-2 text-muted-foreground">
                  {smoteApplied ? "Before SMOTE" : "Current Distribution"}
                </h6>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs">Normal:</span>
                    <Badge variant="outline">{classDistribution.before.normal.toLocaleString()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Malicious:</span>
                    <Badge variant="destructive">{classDistribution.before.malicious.toLocaleString()}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Ratio: {(classDistribution.before.normal / classDistribution.before.malicious).toFixed(1)}:1
                  </div>
                </div>
              </div>

              {smoteApplied && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <h6 className="text-xs font-medium mb-2 text-success">After SMOTE</h6>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs">Normal:</span>
                      <Badge variant="outline">{classDistribution.after.normal.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs">Malicious:</span>
                      <Badge variant="secondary">{classDistribution.after.malicious.toLocaleString()}</Badge>
                    </div>
                    <div className="text-xs text-success mt-2">
                      Ratio: {(classDistribution.after.normal / classDistribution.after.malicious).toFixed(1)}:1
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-medium flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Performance Impact</span>
            </h5>
            
            <div className="space-y-2">
              {Object.entries(performanceMetrics.before).map(([metric, value]) => (
                <div key={metric} className="flex justify-between items-center">
                  <span className="text-xs capitalize">{metric}:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium">
                      {smoteApplied ? performanceMetrics.after[metric as keyof typeof performanceMetrics.after] : value}%
                    </span>
                    {smoteApplied && (
                      <Badge variant="secondary" className="text-xs">
                        +{(performanceMetrics.after[metric as keyof typeof performanceMetrics.after] - value).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SMOTEAnalysis;