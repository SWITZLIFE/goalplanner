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
        {/* Progress bar */}
        <Progress value={progress} className="h-1 absolute top-1/2 -translate-y-1/2" />
        
        {/* Container for indicator dot and milestones */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0">
          {/* Progress indicator dot */}
          <div 
            className="absolute top-1/2 -translate-y-1/2"
            style={{ 
              left: `calc(${Math.min(progress, 100)}% - 5px)`,
              transition: 'left 0.2s ease-out'
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-primary border border-primary" />
          </div>
          
          {/* Milestone numbers */}
          {milestones.map((milestone) => (
            <div 
              key={milestone} 
              className="absolute top-1/2 -translate-y-1/2"
              style={{ 
                left: `${milestone}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <span className="text-xs text-muted-foreground mt-8 block">
                {milestone}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
