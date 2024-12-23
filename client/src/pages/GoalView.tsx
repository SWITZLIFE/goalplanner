import { useRoute, useLocation } from "wouter";
import { useGoals } from "@/hooks/use-goals";
import { GoalProgress } from "@/components/goals/GoalProgress";
import { TaskViews } from "@/components/goals/TaskViews";
import { CoachingCard } from "@/components/coaching/CoachingCard";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { GoalCard } from "@/components/goals/GoalCard";
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
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
import { Gift, BarChart2 } from "lucide-react"; // Added imports for icons


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
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <div className="w-96 border-r p-6 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Goal Planner</h1>
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
        <div className="mt-8 space-y-6">
          <h2 className="text-sm font-medium text-gray-600">Your Goals</h2>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 bg-white">
        <div className="space-y-8 mx-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold mb-2">{goal.title}</h1>
              {goal.description && goal.description !== goal.title && (
                <p className="text-sm text-muted-foreground mb-1">{goal.description}</p>
              )}
              <p className="text-muted-foreground">
                Target completion: {format(new Date(goal.targetDate), "MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex space-x-2">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
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

          <div className="space-y-2">
            <GoalProgress progress={goal.progress} />
            <p className="text-sm text-muted-foreground">{goal.progress}% completed</p>
          </div>

          <div className="space-y-4 w-full">
            <h2 className="text-lg font-medium mb-4">Tasks</h2>
            <TaskViews tasks={goal.tasks || []} goalId={goal.id} goal={goal} />
          </div>
          
          {/* Floating AI Coach */}
          <CoachingCard goalId={goal.id} />
        </div>
      </div>
    </div>
  );
}