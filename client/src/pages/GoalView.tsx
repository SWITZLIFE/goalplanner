import { useRoute, useLocation } from "wouter";
import { useGoals } from "@/hooks/use-goals";
import { GoalProgress } from "@/components/goals/GoalProgress";
import { TaskViews } from "@/components/goals/TaskViews";
import { CoachingCard } from "@/components/coaching/CoachingCard";
import { LeftPanel } from "@/components/LeftPanel";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, CalendarIcon } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { DailyQuote } from "@/components/goals/DailyQuote";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const cardVariants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      duration: 0.5
    }
  }
};

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

export default function GoalView() {
  const [, params] = useRoute("/goals/:id");
  const [, setLocation] = useLocation();
  const { goals, isLoading, deleteGoal } = useGoals();
  const { toast } = useToast();

  const goal = goals.find((g) => g.id === parseInt(params?.id || ""));

  if (isLoading || !goal) {
    return null;
  }

  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <div 
          className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden"
        >
          <div className="h-full overflow-auto scrollbar-hide py-12 px-14">
            <div className="max-w-8xl mx-auto">
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-8"
              >
                <motion.div variants={cardVariants}>
                  <div className="flex justify-between items-start group">
                    <div>
                      <h1 className="text-2xl font-semibold mb-2">{goal.title}</h1>
                      {goal.description && goal.description !== goal.title && (
                        <p className="text-sm text-muted-foreground mb-1">{goal.description}</p>
                      )}
                      <p className="text-muted-foreground flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" /> {format(new Date(goal.targetDate), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-destructive hover:text-destructive/80 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will permanently delete this goal and all its tasks.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => {
                              try {
                                await deleteGoal(goal.id);
                                toast({
                                  title: "Goal deleted",
                                  description: "The goal has been permanently deleted.",
                                });
                                setLocation("/");
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to delete goal. Please try again.",
                                  variant: "destructive",
                                });
                              }
                            }}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={cardVariants}>
                  <DailyQuote goalId={goal.id} />
                </motion.div>

                <motion.div variants={cardVariants}>
                  <div className="space-y-2">
                    <GoalProgress progress={goal.progress} variant="linear" />
                    <p className="text-sm text-muted-foreground">{goal.progress}% completed</p>
                  </div>
                </motion.div>

                <motion.div variants={cardVariants}>
                  <div className="space-y-4 w-full">
                    <TaskViews tasks={goal.tasks || []} goalId={goal.id} goal={goal} />
                  </div>
                </motion.div>

                <motion.div variants={cardVariants}>
                  <CoachingCard goalId={goal.id} />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}