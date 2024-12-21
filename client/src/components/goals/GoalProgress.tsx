import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GoalProgressProps {
  progress: number;
}

export function GoalProgress({ progress }: GoalProgressProps) {
  const milestones = [25, 50, 75, 100];
  
  return (
    <div className="space-y-4">
      <div className="relative h-8">
        <Progress value={progress} className="h-1 absolute top-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full">
          {/* Progress indicator dot */}
          <div 
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${progress}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-primary border border-primary -ml-[5px]" />
          </div>
          
          {/* Milestone numbers */}
          <div className="flex items-center justify-between w-full">
            {milestones.map((milestone) => (
              <div key={milestone} className="relative flex flex-col items-center">
                <span className="text-xs text-muted-foreground mt-4">
                  {milestone}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
