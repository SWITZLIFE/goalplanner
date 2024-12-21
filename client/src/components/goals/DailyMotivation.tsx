import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareQuote } from "lucide-react";

export function DailyMotivation() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/motivation/daily"],
  });

  if (error) {
    return null; // Silently fail if there's an error
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <MessageSquareQuote className="h-6 w-6 text-primary/60 mt-1 flex-shrink-0" />
          <div className="space-y-2 min-h-[60px]">
            <h3 className="text-sm font-medium text-primary/60">
              Message from your future self
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            ) : (
              <p className="text-lg text-primary">
                {data?.message || "Loading your daily message..."}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
