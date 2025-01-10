import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface WeeklySummaryProps {
  goalId: number;
  goalTitle: string;
}

interface WeeklySummary {
  summary: string;
  completedTasks: number;
  totalTasks: number;
  nextWeekTasks: number;
}

export function WeeklySummary({ goalId, goalTitle }: WeeklySummaryProps) {
  const [showSummary, setShowSummary] = useState(false);
  const { toast } = useToast();

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/goals/${goalId}/weekly-summary`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json() as Promise<WeeklySummary>;
    },
    onSuccess: () => {
      setShowSummary(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate summary",
        variant: "destructive",
      });
    },
  });

  const { data: summary, isLoading: isSummaryLoading } = useQuery<WeeklySummary>({
    queryKey: [`/api/goals/${goalId}/weekly-summary`],
    enabled: showSummary,
  });

  const startDate = startOfWeek(new Date());
  const endDate = endOfWeek(new Date());

  return (
    <>
      <Button
        variant="outline"
        onClick={() => generateSummaryMutation.mutate()}
        disabled={generateSummaryMutation.isPending}
        className="w-full"
      >
        {generateSummaryMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Summary...
          </>
        ) : (
          "Summary of the Week"
        )}
      </Button>

      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Weekly Summary for {goalTitle}</DialogTitle>
            <DialogDescription>
              {format(startDate, "MMMM d")} - {format(endDate, "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          {isSummaryLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-2 font-medium">Weekly Progress Overview</h3>
                <div className="space-y-2 text-sm">
                  <p>Completed Tasks: {summary.completedTasks} of {summary.totalTasks}</p>
                  <p>Tasks Planned for Next Week: {summary.nextWeekTasks}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">AI-Generated Summary</h3>
                <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm">
                  {summary.summary}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No summary data available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}