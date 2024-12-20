import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Timer, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskTimerProps {
  taskId: number;
  totalMinutesSpent: number;
  onTimerStop?: (coinsEarned: number) => void;
}

export function TaskTimer({ taskId, totalMinutesSpent, onTimerStop }: TaskTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query current timer state
  const { data: activeTimer, isLoading } = useQuery({
    queryKey: ["/api/timer/current"],
    refetchInterval: 1000, // Poll every second to keep timer state in sync
  });

  // Start timer mutation
  const startTimer = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/timer/start`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timer/current"] });
      toast({
        title: "Timer Started",
        description: "Time tracking has begun for this task",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to start timer",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Stop timer mutation
  const stopTimer = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/timer/stop`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timer/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] }); // Refresh goals to get updated task times
      onTimerStop?.(data.coinsEarned);
      toast({
        title: "Timer Stopped",
        description: `You earned ${data.coinsEarned} coins!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to stop timer",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Update elapsed time every second when timer is active
  useEffect(() => {
    if (activeTimer && activeTimer.taskId === taskId) {
      const startTime = new Date(activeTimer.startTime).getTime();
      const interval = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [activeTimer, taskId]);

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const isCurrentTask = activeTimer?.taskId === taskId;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <div className="font-mono text-lg">
          {formatTime(elapsedTime)}
        </div>
      {!activeTimer ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => startTimer.mutate()}
          disabled={startTimer.isPending}
        >
          <Timer className="h-4 w-4 mr-2" />
          Start Timer
        </Button>
      ) : isCurrentTask ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => stopTimer.mutate()}
          disabled={stopTimer.isPending}
        >
          <StopCircle className="h-4 w-4 mr-2" />
          Stop Timer
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Timer Active on Another Task
        </Button>
      )}
      </div>
      {totalMinutesSpent > 0 && (
        <div className="text-sm text-muted-foreground mt-1">
          Total time spent: {Math.floor(totalMinutesSpent / 60)}h {totalMinutesSpent % 60}m
        </div>
      )}
    </div>
  );
}
