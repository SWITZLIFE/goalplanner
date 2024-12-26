import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { VisionBoard } from "@/components/vision-board/VisionBoard";
import { LeftPanel } from "@/components/LeftPanel";
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
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      <LeftPanel />

      {/* Main Content Area */}
      <motion.div
        initial={{ x: 50, opacity: 1 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="flex-1 px-8 py-4 bg-white overflow-hidden"
      >
        <div className="max-w-8xl mx-auto ml-4">
          <VisionBoard />
        </div>
      </motion.div>
    </div>
  );
}
