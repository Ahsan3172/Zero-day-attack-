import { useState } from "react";
import { Brain, Play, Pause, RotateCcw, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ModelTraining = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState("random_forest");
  const { toast } = useToast();

  const models = [
    { id: "random_forest", name: "Random Forest", status: "recommended" },
    { id: "isolation_forest", name: "Isolation Forest", status: "available" },
    { id: "one_class_svm", name: "One Class SVM", status: "available" },
    { id: "deep_autoencoders", name: "Deep Autoencoders", status: "available" },
  ];

  const startTraining = () => {
    setIsTraining(true);
    setTrainingProgress(0);
    
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          toast({
            title: "Model training completed",
            description: "Random Forest model is ready for testing",
          });
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>Model Training</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Select Algorithm</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {models.map((model) => (
              <Button
                key={model.id}
                variant={selectedModel === model.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedModel(model.id)}
                className="justify-between text-xs sm:text-sm h-auto py-2 px-3"
              >
                <span className="truncate">{model.name}</span>
                {model.status === "recommended" && (
                  <Badge variant="secondary" className="ml-1 text-xs shrink-0">Best</Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Training Progress</h4>
            <span className="text-sm text-muted-foreground">
              {Math.round(trainingProgress)}%
            </span>
          </div>
          <Progress value={trainingProgress} className="h-2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={startTraining}
            disabled={isTraining}
            className="cyber-glow text-xs sm:text-sm"
          >
            {isTraining ? (
              <>
                <Pause className="h-4 w-4 mr-1 sm:mr-2" />
                Training...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1 sm:mr-2" />
                Start Training
              </>
            )}
          </Button>
          <Button variant="outline" disabled={isTraining} className="text-xs sm:text-sm">
            <RotateCcw className="h-4 w-4 mr-1 sm:mr-2" />
            Reset
          </Button>
        </div>

        {trainingProgress === 100 && (
          <div className="flex items-center space-x-2 p-3 bg-success/10 border border-success/20 rounded-lg">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium">Training Complete</p>
              <p className="text-xs text-muted-foreground break-words">
                Accuracy: 96.8% | Precision: 95.2% | Recall: 94.7%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelTraining;