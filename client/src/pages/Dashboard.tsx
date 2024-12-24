import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { VisionBoard } from "@/components/vision-board/VisionBoard";
import { GoalCard } from "@/components/goals/GoalCard";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { useGoals } from "@/hooks/use-goals";
import { Gift, Loader2, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

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
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-96 border-r p-6 bg-gray-50"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Goal Planner</h1>
          <CoinBalance />
        </div>

        <CreateGoalDialog />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-6"
        >
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
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mt-8 space-y-4"
        >
          <h2 className="text-sm font-medium text-gray-600">Your Goals</h2>
          {goals.length === 0 ? (
            <motion.p 
              variants={itemVariants}
              className="text-muted-foreground text-sm"
            >
              No goals yet. Create your first goal to get started!
            </motion.p>
          ) : (
            goals.map((goal) => (
              <motion.div
                key={goal.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <GoalCard goal={goal} />
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.div>

      {/* Main Content Area */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex-1 p-8 bg-white"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <VisionBoard />
        </div>
      </motion.div>
    </div>
  );
}