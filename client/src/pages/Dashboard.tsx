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

      {/* Main Content Area */}
      <div className="flex-1 p-8 bg-white">
        {/* This area will show the selected goal's details */}
        <div className="max-w-3xl mx-auto">
          <p className="text-muted-foreground text-sm">
            Select a goal from the sidebar to view details
          </p>
        </div>
      </div>
    </div>
  );
}
