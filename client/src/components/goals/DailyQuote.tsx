import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Quote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DailyQuoteProps {
  goalId: number;
}

interface QuoteResponse {
  quote: string;
  isRead: boolean;
}

export function DailyQuote({ goalId }: DailyQuoteProps) {
  const { data: quoteData, isLoading, error } = useQuery<QuoteResponse>({
    queryKey: [`/api/goals/${goalId}/quote`],
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401) return false;
      return failureCount < 3;
    },
    enabled: !!goalId, // Only run query if we have a goalId
  });

  useEffect(() => {
    if (quoteData && !quoteData.isRead) {
      fetch(`/api/goals/${goalId}/quote/read`, {
        method: 'POST',
        credentials: 'include',
      }).catch(console.error);
    }
  }, [quoteData, goalId]);

  // Don't render anything if there's an auth error or no quote
  if (isLoading || error || !quoteData?.quote) {
    return null;
  }

  return (
    <Card className={cn(
      "bg-primary/5 p-4 relative group transition-all duration-200",
      "hover:bg-primary/10"
    )}>
      <div className="flex gap-3">
        <Quote className="h-5 w-5 text-primary shrink-0 mt-1" />
        <p className="text-sm italic">
          {quoteData.quote}
        </p>
      </div>
    </Card>
  );
}