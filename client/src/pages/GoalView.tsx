import { useRoute } from "wouter";
import { useGoals } from "@/hooks/use-goals";
import { GoalProgress } from "@/components/goals/GoalProgress";
import { TaskList } from "@/components/goals/TaskList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function GoalView() {
  const [, params] = useRoute("/goals/:id");
  const { goals, isLoading } = useGoals();
  
  const goal = goals.find((g) => g.id === parseInt(params?.id || ""));

  if (isLoading || !goal) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Goals
          </Button>
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">{goal.title}</h1>
            <p className="text-muted-foreground">
              Target completion: {format(new Date(goal.targetDate), "MMMM d, yyyy")}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-medium">Progress</h2>
            <GoalProgress progress={goal.progress} />
            <p className="text-sm text-muted-foreground">{goal.progress}% completed</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium">Tasks</h2>
            <TaskList tasks={goal.tasks || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
