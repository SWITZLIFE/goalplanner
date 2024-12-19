import { useRoute } from "wouter";
import { useGoals } from "@/hooks/use-goals";
import { GoalProgress } from "@/components/goals/GoalProgress";
import { TaskList } from "@/components/goals/TaskList";
import { CoachingCard } from "@/components/coaching/CoachingCard";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { CoinBalance } from "@/components/rewards/CoinBalance";
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
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <div className="w-96 border-r p-6 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Goal Planner</h1>
          <CoinBalance />
        </div>

        <CreateGoalDialog />
        
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-medium text-gray-600">Your Goals</h2>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 bg-white">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold mb-2">{goal.title}</h1>
              <p className="text-muted-foreground">
                Target completion: {format(new Date(goal.targetDate), "MMMM d, yyyy")}
              </p>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            <GoalProgress progress={goal.progress} />
            <p className="text-sm text-muted-foreground">{goal.progress}% completed</p>
          </div>

          <div className="grid gap-8 grid-cols-5">
            <div className="col-span-3">
              <h2 className="text-lg font-medium mb-4">Tasks</h2>
              <TaskList tasks={goal.tasks || []} />
            </div>
            <div className="col-span-2">
              <CoachingCard goalId={goal.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
