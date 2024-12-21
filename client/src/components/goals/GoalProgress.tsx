import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GoalProgressProps {
  progress: number;
}

export function GoalProgress({ progress }: GoalProgressProps) {
  const milestones = [25, 50, 75, 100];
  
  return (
    <div className="space-y-2 relative">
      <Progress value={progress} className="h-1.5" />
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between px-0">
        {milestones.map((milestone) => (
          <div
            key={milestone}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-colors duration-200",
              progress >= milestone
                ? "bg-primary border-primary"
                : "bg-secondary border-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
