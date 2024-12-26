
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { RewardStore } from "@/components/rewards/RewardStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, BarChart2 } from "lucide-react";
import { Link } from "wouter";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { useGoals } from "@/hooks/use-goals";
import { LeftPanel } from "@/components/LeftPanel";

export default function RewardPage() {
  const { goals } = useGoals();

  return (
    <div className="min-h-screen flex pt-8">
      <LeftPanel />

      {/* Main Content Area */}
      <div className="flex-1 p-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <RewardStore />
        </div>
      </div>
    </div>
  );
}
