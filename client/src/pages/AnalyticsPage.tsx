
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, BarChart2 } from "lucide-react";
import { Link } from "wouter";
import { LeftPanel } from "@/components/LeftPanel";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { useGoals } from "@/hooks/use-goals";

export default function AnalyticsPage() {
  const { goals } = useGoals();

  return (
    <div className="min-h-screen flex pt-8">
      <LeftPanel />

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
