import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { GoalProgress } from "./GoalProgress";
import type { Goal } from "@db/schema";
import { format } from "date-fns";
import { Link } from "wouter";

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
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
