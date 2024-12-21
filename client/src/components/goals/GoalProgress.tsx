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
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full flex items-center justify-between">
          {milestones.map((milestone) => (
            <div key={milestone} className="relative flex flex-col items-center">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full border transition-colors duration-200",
                  progress >= milestone
                    ? "bg-primary border-primary"
                    : "bg-background border-muted"
                )}
              />
              <span className="text-xs text-muted-foreground mt-4">
                {milestone}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
