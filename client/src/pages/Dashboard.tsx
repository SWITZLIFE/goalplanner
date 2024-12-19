import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { useGoals } from "@/hooks/use-goals";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { goals, isLoading } = useGoals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Goal Achievement Planner</h1>
        <CoinBalance />
      </div>

      <div className="max-w-md mx-auto">
        <CreateGoalDialog />
        
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium">Your Goals</h2>
          {goals.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No goals yet. Create your first goal to get started!
            </p>
          ) : (
            goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
