
import { Card, CardHeader, CardContent } from "@/components/ui/card";
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
        "cursor-pointer hover:shadow-md transition-shadow mb-6",
        isActive && "bg-primary/5 border-primary/20 [&_.progress-bar]:bg-white"
      )}>
        <CardHeader className="pb-2">
          <h3 className="font-medium text-lg">{goal.title}</h3>
          <p className="text-sm text-muted-foreground">
            Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
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
