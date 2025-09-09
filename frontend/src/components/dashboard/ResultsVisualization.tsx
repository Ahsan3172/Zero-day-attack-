import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, Zap } from "lucide-react";

const ResultsVisualization = () => {
  const confusionMatrixData = [
    { name: "True Positive", value: 2847, fill: "hsl(var(--success))" },
    { name: "False Positive", value: 156, fill: "hsl(var(--warning))" },
    { name: "True Negative", value: 3201, fill: "hsl(var(--primary))" },
    { name: "False Negative", value: 89, fill: "hsl(var(--destructive))" },
  ];

  const performanceData = [
    { model: "Random Forest", accuracy: 96.8, precision: 95.2, recall: 94.7, f1: 94.9 },
    { model: "Isolation Forest", accuracy: 87.3, precision: 82.1, recall: 89.4, f1: 85.6 },
    { model: "One Class SVM", accuracy: 84.2, precision: 79.8, recall: 86.1, f1: 82.8 },
    { model: "Deep Autoencoders", accuracy: 91.5, precision: 88.3, recall: 89.7, f1: 89.0 },
  ];

  const featureImportance = [
    { feature: "Flow Duration", importance: 0.23 },
    { feature: "Total Fwd Packets", importance: 0.19 },
    { feature: "Packet Length Mean", importance: 0.16 },
    { feature: "Flow Bytes/s", importance: 0.14 },
    { feature: "Fwd Packet Length Max", importance: 0.12 },
    { feature: "Bwd Packet Length Mean", importance: 0.16 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Model Performance Comparison</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="model" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Legend />
              <Bar dataKey="accuracy" fill="hsl(var(--primary))" name="Accuracy %" />
              <Bar dataKey="precision" fill="hsl(var(--success))" name="Precision %" />
              <Bar dataKey="recall" fill="hsl(var(--warning))" name="Recall %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Confusion Matrix</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={confusionMatrixData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={(entry) => `${entry.name}: ${entry.value}`}
              >
                {confusionMatrixData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Feature Importance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={featureImportance} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 0.25]} />
              <YAxis dataKey="feature" type="category" width={150} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
                formatter={(value) => [`${(value as number * 100).toFixed(1)}%`, "Importance"]}
              />
              <Bar dataKey="importance" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsVisualization;