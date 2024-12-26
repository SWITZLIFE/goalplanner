
import { Button } from "@/components/ui/button";
import { Gift, BarChart2 } from "lucide-react";
import { Link } from "wouter";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { useGoals } from "@/hooks/use-goals";

export function LeftPanel() {
  const { goals } = useGoals();

  return (
    <div className="w-96 border-r p-6 bg-primary h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-l font-semibold">Coin balance</h1>
        <CoinBalance />
      </div>

      <CreateGoalDialog />

      <div className="mt-6">
        <Link href="/rewards">
          <Button variant="subtle" className="w-full">
            <Gift className="mr-2 h-4 w-4" />
            Reward Store
          </Button>
        </Link>
        <Link href="/analytics" className="block mt-4">
          <Button variant="subtle" className="w-full">
            <BarChart2 className="mr-2 h-4 w-4" />
            View Analytics
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium text-white mb-4">Your Goals</h2>
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-20rem)] scrollbar-hide">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>
    </div>
  );
}
