import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { VisionBoard } from "@/components/vision-board/VisionBoard";
import { GoalCard } from "@/components/goals/GoalCard";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { useGoals } from "@/hooks/use-goals";
import { Gift, Loader2, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

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
      <motion.div
        initial={{ y: 50, opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="w-96 border-r p-6 bg-gray-100"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Coin Balance</h2>
          <CoinBalance />
        </div>

        <CreateGoalDialog />

        <div className="mt-6">
          <Link href="/rewards">
            <Button variant="outline" className="w-full">
              <Gift className="mr-2 h-4 w-4" />
              Reward Store
            </Button>
          </Link>
          <Link href="/analytics" className="block mt-4">
            <Button variant="outline" className="w-full">
              <BarChart2 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-medium text-gray-600">Your Goals</h2>
          {goals.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No goals yet. Create your first goal to get started!
            </p>
          ) : (
            goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
          )}
        </div>
      </motion.div>

      {/* Main Content Area */}
      <motion.div
        initial={{ x: 50, opacity: 1 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="flex-1 p-8 bg-white"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <VisionBoard />
        </div>
      </motion.div>
    </div>
  );
}
