import { Button } from "@/components/ui/button";
import { Gift, BarChart2, PlusCircle } from "lucide-react";
import { Link } from "wouter";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { useGoals } from "@/hooks/use-goals";

export function LeftPanel() {
  const { goals } = useGoals();

  return (
    <div className="w-96 bg-primary h-screen overflow-hidden">
      <div className="flex justify-between items-center p-6 pb-0 mt-10 mb-10">
        <h1 className="text-l font-semibold text-white">Coin balance</h1>
        <CoinBalance />
      </div>
      <div className="p-6 pt-0">
        <CreateGoalDialog />

        <div className="mt-4">
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
        
      </div>
      

      <div className="px-6">
        <h2 className="text-sm font-medium text-white mb-4">Your Goals</h2>
        <div className="space-y-6 overflow-hidden">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>
    </div>
  );
}