import { useState } from "react";
import { Filter, Zap, BarChart3, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const FeatureSelection = () => {
  const [isApplying, setIsApplying] = useState(false);
  const [appliedTechniques, setAppliedTechniques] = useState<string[]>([]);

  const techniques = [
    { id: "correlation", name: "Correlation Analysis", description: "Remove highly correlated features" },
    { id: "rfe", name: "Recursive Feature Elimination", description: "Select best features recursively" },
    { id: "chi2", name: "Chi-Square Test", description: "Statistical feature selection" },
    { id: "mutual_info", name: "Mutual Information", description: "Information gain based selection" },
  ];

  const beforeAfterStats = {
    before: { features: 49, accuracy: 93.2, precision: 91.8, recall: 89.4 },
    after: { features: 23, accuracy: 96.8, precision: 95.2, recall: 94.7 }
  };

  const applyTechnique = (techniqueId: string) => {
    setIsApplying(true);
    setTimeout(() => {
      setAppliedTechniques(prev => [...prev, techniqueId]);
      setIsApplying(false);
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Feature Selection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Available Techniques</h4>
          <div className="space-y-2">
            {techniques.map((technique) => (
              <div key={technique.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{technique.name}</span>
                    {appliedTechniques.includes(technique.id) && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {technique.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={appliedTechniques.includes(technique.id) ? "outline" : "default"}
                  onClick={() => applyTechnique(technique.id)}
                  disabled={isApplying || appliedTechniques.includes(technique.id)}
                >
                  {appliedTechniques.includes(technique.id) ? "Applied" : "Apply"}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {appliedTechniques.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Before vs After Comparison</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <h5 className="text-sm font-medium mb-2 text-muted-foreground">Before Selection</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs">Features:</span>
                    <span className="text-xs font-medium">{beforeAfterStats.before.features}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Accuracy:</span>
                    <span className="text-xs font-medium">{beforeAfterStats.before.accuracy}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Precision:</span>
                    <span className="text-xs font-medium">{beforeAfterStats.before.precision}%</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <h5 className="text-sm font-medium mb-2 text-success">After Selection</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs">Features:</span>
                    <span className="text-xs font-medium">{beforeAfterStats.after.features}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Accuracy:</span>
                    <span className="text-xs font-medium">{beforeAfterStats.after.accuracy}% 
                      <Badge variant="secondary" className="ml-1">+3.6%</Badge>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs">Precision:</span>
                    <span className="text-xs font-medium">{beforeAfterStats.after.precision}%
                      <Badge variant="secondary" className="ml-1">+3.4%</Badge>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeatureSelection;