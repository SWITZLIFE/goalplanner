import { Progress } from "@/components/ui/progress";

interface GoalProgressProps {
  progress: number;
}

export function GoalProgress({ progress }: GoalProgressProps) {
  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-2" />
    </div>
  );
}
