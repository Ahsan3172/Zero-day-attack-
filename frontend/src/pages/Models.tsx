import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, CheckCircle, AlertCircle, Play, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Models = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user has admin role
  const isAdmin = user?.role === 'admin';

  const models = [
    {
      id: 1,
      name: "Random Forest v2.1",
      type: "Random Forest",
      accuracy: "96.8%",
      status: "active",
      lastTrained: "2024-01-15",
      description: "Best performing model for network intrusion detection"
    },
    {
      id: 2,
      name: "Isolation Forest v1.3",
      type: "Isolation Forest",
      accuracy: "87.3%",
      status: "active",
      lastTrained: "2024-01-12",
      description: "Unsupervised anomaly detection for outlier identification"
    },
    {
      id: 3,
      name: "One Class SVM v2.0",
      type: "One Class SVM",
      accuracy: "84.2%",
      status: "training",
      lastTrained: "2024-01-10",
      description: "One-class classification for novelty detection"
    },
    {
      id: 4,
      name: "Deep Autoencoders v1.8",
      type: "Deep Autoencoders",
      accuracy: "91.5%",
      status: "inactive",
      lastTrained: "2024-01-08",
      description: "Deep learning model for anomaly detection and reconstruction"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "training":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "training":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleActivateModel = (modelName: string) => {
    toast({
      title: "Model activated",
      description: `${modelName} is now active for threat detection`,
    });
  };

  const handleDeleteModel = (modelName: string) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete models",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Model deleted",
      description: `${modelName} has been removed from the system`,
      variant: "destructive"
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            Models
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin Features Available
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Manage and monitor your machine learning models
            {!isAdmin && " • Contact admin to delete models"}
          </p>
        </div>
        <Button disabled={!isAdmin}>
          <Brain className="h-4 w-4 mr-2" />
          Deploy New Model
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {models.map((model) => (
          <Card key={model.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>{model.name}</span>
                </CardTitle>
                <Badge className={getStatusColor(model.status)}>
                  {getStatusIcon(model.status)}
                  <span className="ml-1 capitalize">{model.status}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{model.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <div className="font-medium">{model.type}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Accuracy:</span>
                    <div className="font-medium text-success">{model.accuracy}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Last trained:</span>
                    <div className="font-medium">{model.lastTrained}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {model.status !== "active" && (
                  <Button 
                    size="sm" 
                    onClick={() => handleActivateModel(model.name)}
                    disabled={model.status === "training"}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Activate
                  </Button>
                )}
                {isAdmin && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDeleteModel(model.name)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Models;