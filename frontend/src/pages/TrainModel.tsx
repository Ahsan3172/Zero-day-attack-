import ModelTraining from "@/components/dashboard/ModelTraining";

const TrainModel = () => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Train Model</h1>
        <p className="text-muted-foreground">Configure and train new machine learning models for threat detection</p>
      </div>
      <ModelTraining />
    </div>
  );
};

export default TrainModel;