import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { GoalProgress } from "./GoalProgress";
import type { Goal } from "@db/schema";
import { format } from "date-fns";
import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [, params] = useRoute("/goals/:id");
  const isActive = params?.id === goal.id.toString();

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200 mb-4",
        isActive && "bg-primary/5 border-primary/20"
      )}>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1.5">
              <h3 className="font-medium text-sm line-clamp-2">{goal.title}</h3>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <CalendarIcon className="h-3.5 w-3.5" /> 
                {format(new Date(goal.targetDate), "MMM d, yyyy")}
              </div>
            </div>
            <GoalProgress progress={goal.progress} variant="circular" size="sm" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}