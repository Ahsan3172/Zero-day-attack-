import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Play, FileText } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const TestModels = () => {
  const [selectedModel, setSelectedModel] = useState("");
  const [isTestingFile, setIsTestingFile] = useState<File | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const models = [
    { id: "random-forest", name: "Random Forest Classifier" },
    { id: "isolation-forest", name: "Isolation Forest" },
    { id: "one-class-svm", name: "One Class SVM" },
    { id: "deep-autoencoders", name: "Deep Autoencoders" }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/csv") {
      setIsTestingFile(file);
      toast({
        title: "File uploaded successfully",
        description: `${file.name} is ready for testing`,
      });
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
    }
  };

  const handleStartTesting = () => {
    if (!selectedModel || !isTestingFile) {
      toast({
        title: "Missing requirements",
        description: "Please select a model and upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    
    // Simulate testing process
    setTimeout(() => {
      setIsTesting(false);
      toast({
        title: "Testing completed",
        description: "Model testing results are ready for review",
      });
    }, 3000);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Test Models</h1>
        <p className="text-muted-foreground">Test your trained models with new data to evaluate performance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-select">Choose Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trained model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Data Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-file">Upload CSV Test File</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="test-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="w-full file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <Upload className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {isTestingFile && (
                  <p className="text-sm text-success flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {isTestingFile.name} uploaded successfully
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Testing Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleStartTesting}
            disabled={!selectedModel || !isTestingFile || isTesting}
            className="w-full"
            size="lg"
          >
            <Play className="h-5 w-5 mr-2" />
            {isTesting ? "Testing in Progress..." : "Start Model Testing"}
          </Button>
        </CardContent>
      </Card>

      {isTesting && (
        <Card>
          <CardHeader>
            <CardTitle>Testing Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Processing test data with {models.find(m => m.id === selectedModel)?.name}...
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{width: "60%"}}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestModels;