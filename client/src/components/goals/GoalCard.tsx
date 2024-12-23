import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { GoalProgress } from "./GoalProgress";
import type { Goal } from "@db/schema";
import { format } from "date-fns";
import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [, params] = useRoute("/goals/:id");
  const isActive = params?.id === goal.id.toString();

  // Fetch quote for this goal
  const { data: quoteData, isLoading: isQuoteLoading } = useQuery({
    queryKey: [`/api/goals/${goal.id}/quote`],
    staleTime: 24 * 60 * 60 * 1000, // Refresh quote daily
  });

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className={cn(
        "cursor-pointer hover:shadow-md transition-shadow mb-6",
        isActive && "bg-primary/5 border-primary/20"
      )}>
        <CardHeader className="pb-2">
          <h3 className="font-medium text-lg">{goal.title}</h3>
          <p className="text-sm text-muted-foreground">
            Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
          </p>
        </CardHeader>
        <CardContent>
          {/* Quote Section */}
          {isQuoteLoading ? (
            <Skeleton className="h-8 w-full mb-4" />
          ) : quoteData?.quote ? (
            <div className="mb-4 text-sm italic text-muted-foreground text-center border-l-2 border-primary/20 pl-3">
              "{quoteData.quote}"
            </div>
          ) : null}

          <GoalProgress progress={goal.progress} />
          <div className="mt-2 text-sm text-muted-foreground">
            {goal.progress}% completed
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}