
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, BarChart2 } from "lucide-react";
import { Link } from "wouter";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { useGoals } from "@/hooks/use-goals";

export default function AnalyticsPage() {
  const { goals } = useGoals();

  return (
    <div className="min-h-screen flex pt-8">
      {/* Left Sidebar */}
      <div className="w-96 border-r p-6 bg-gray-100">
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

        <div className="mt-8 space-y-6">
          <h2 className="text-sm font-medium text-gray-600 mb-4">Your Goals</h2>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          </div>
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}
