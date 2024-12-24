import { useState, useEffect } from "react";
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
  const [isVisible, setIsVisible] = useState(true);

  const { data: quoteData, isLoading } = useQuery<QuoteResponse>({
    queryKey: [`/api/goals/${goalId}/quote`],
  });

  useEffect(() => {
    if (quoteData && !quoteData.isRead) {
      fetch(`/api/goals/${goalId}/quote/read`, {
        method: 'POST',
        credentials: 'include',
      }).catch(console.error);
    }
  }, [quoteData, goalId]);

  if (!isVisible || isLoading || !quoteData?.quote) {
    return null;
  }

  return (
    <Card className={cn(
      "bg-primary/5 p-4 relative group transition-all duration-200",
      "hover:bg-primary/10"
    )}>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity"
      >
        ✕
      </button>
      <div className="flex gap-3">
        <Quote className="h-5 w-5 text-primary shrink-0 mt-1" />
        <p className="text-sm italic">
          {quoteData.quote}
        </p>
      </div>
    </Card>
  );
}