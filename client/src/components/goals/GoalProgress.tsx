import { format } from "date-fns";

interface GoalProgressProps {
  progress: number;
  targetDate: string;
  createdAt?: string;
}

export function GoalProgress({ progress, targetDate, createdAt }: GoalProgressProps) {
  const startDate = createdAt ? new Date(createdAt) : new Date();
  const endDate = new Date(targetDate);

  return (
    <div className="relative pt-6 pb-2">
      {/* Timeline bar */}
      <div className="h-2 w-full bg-gray-100 rounded-full relative">
        {/* Progress fill */}
        <div 
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        
        {/* Progress marker */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-white transition-all duration-300"
          style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
        />

        {/* Start date marker */}
        <div className="absolute -top-6 left-0 transform -translate-x-1/2">
          <div className="w-3 h-3 bg-primary rounded-full mb-1 mx-auto" />
          <span className="text-xs text-gray-600 whitespace-nowrap">
            {format(startDate, "MMM d, yy")}
          </span>
        </div>

        {/* End date marker */}
        <div className="absolute -top-6 right-0 transform translate-x-1/2">
          <div className="w-3 h-3 bg-primary rounded-full mb-1 mx-auto" />
          <span className="text-xs text-gray-600 whitespace-nowrap">
            {format(endDate, "MMM d, yy")}
          </span>
        </div>
      </div>
    </div>
  );
}
