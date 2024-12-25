
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { CalendarIcon, X } from "lucide-react";
import { GoalProgress } from "./GoalProgress";
import type { Goal } from "@db/schema";
import { format } from "date-fns";
import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGoals } from "@/hooks/use-goals";

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [, params] = useRoute("/goals/:id");
  const isActive = params?.id === goal.id.toString();
  const { toast } = useToast();
  const { deleteGoal } = useGoals();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    try {
      await deleteGoal(goal.id);
      toast({
        title: "Goal deleted",
        description: "The goal has been permanently deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className={cn(
        "cursor-pointer hover:shadow-md transition-shadow mb-6 group relative",
        isActive && "bg-primary/5 border-primary/20 [&_.progress-bar]:bg-white"
      )}>
        <button
          onClick={handleDelete}
          className="absolute hidden group-hover:flex items-center justify-center top-2 right-2 w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
        <CardHeader className="pb-2">
          <h3 className="font-medium text-lg">{goal.title}</h3>
          <p className="text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" /> {format(new Date(goal.targetDate), "MMM d, yyyy")}
            </div>
          </p>
        </CardHeader>
        <CardContent>
          <GoalProgress progress={goal.progress} />
          <div className="mt-2 text-sm text-muted-foreground">
            {goal.progress}% completed
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
