import { useQuery } from "@tanstack/react-query";
import { Lightbulb, Brain, Rocket } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CoachingCardProps {
  goalId: number;
}

export function CoachingCard({ goalId }: CoachingCardProps) {
  const { data: coaching, isLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}/coaching`],
    refetchInterval: 60000, // Refresh every minute to get new advice
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Coach</CardTitle>
          <CardDescription>Loading personalized advice...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!coaching) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Coach</CardTitle>
        <CardDescription>Here's your personalized guidance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Rocket className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-medium mb-1">Motivation</h3>
            <p className="text-sm text-muted-foreground">{coaching.motivation}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Brain className="h-5 w-5 text-purple-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-medium mb-1">Actionable Advice</h3>
            <p className="text-sm text-muted-foreground">{coaching.advice}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-medium mb-1">Productivity Tip</h3>
            <p className="text-sm text-muted-foreground">{coaching.tip}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
