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

interface TimerResponse {
  timer: {
    id: number;
    taskId: number;
    startTime: string;
    endTime: string | null;
    coinsEarned: number;
    isActive: boolean;
  };
  task: {
    id: number;
    totalMinutesSpent: number;
  };
  coinsEarned: number;
}

interface ActiveTimer {
  id: number;
  taskId: number;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
}

export function TaskTimer({ taskId, totalMinutesSpent, onTimerStop }: TaskTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query current timer state with reduced polling frequency and proper error handling
  const { data: activeTimer, isLoading, error } = useQuery<ActiveTimer | null>({
    queryKey: ["/api/timer/current"],
    refetchInterval: 5000, // Poll every 5 seconds instead of every second
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchIntervalInBackground: false, // Don't poll when tab is in background
    staleTime: 4000, // Consider data fresh for 4 seconds
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      if (error?.status === 401) return false;
      return failureCount < 3;
    },
    enabled: !!taskId, // Only run query if we have a taskId
  });

  // Start timer mutation
  const startTimer = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/timer/start`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("You must be logged in to start a timer");
        }
        throw new Error(await res.text());
      }
      return res.json() as Promise<ActiveTimer>;
    },
    onSuccess: () => {
      // Only invalidate necessary queries
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
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("You must be logged in to stop a timer");
        }
        throw new Error(await res.text());
      }
      const data: TimerResponse = await res.json();
      return data;
    },
    onSuccess: async (data) => {
      setElapsedTime(0);
      onTimerStop?.(data.coinsEarned);

      // Batch invalidations to reduce network requests
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return (
            queryKey === "/api/timer/current" ||
            queryKey === "/api/rewards"
          );
        },
      });

      toast({
        title: "Timer Stopped",
        description: `You earned ${data.coinsEarned} coins! Total time: ${String(Math.floor(data.task.totalMinutesSpent / 60)).padStart(2, '0')}:${String(data.task.totalMinutesSpent % 60).padStart(2, '0')}`,
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

  // Update elapsed time using local state management
  useEffect(() => {
    if (activeTimer?.taskId === taskId && activeTimer?.isActive) {
      const startTime = new Date(activeTimer.startTime).getTime();
      const updateInterval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => clearInterval(updateInterval);
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

  if (error) {
    return null; // Don't show timer controls if there's an auth error
  }

  const isCurrentTask = activeTimer?.taskId === taskId;

  return (
    <div className="flex items-center gap-2">
      {isCurrentTask && (
        <div className="font-mono text-lg">
          {formatTime(elapsedTime)}
        </div>
      )}
      {!activeTimer ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startTimer.mutate()}
          disabled={startTimer.isPending}
          title="Start Timer"
        >
          <Timer className="h-4 w-4" />
        </Button>
      ) : isCurrentTask ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => stopTimer.mutate()}
          disabled={stopTimer.isPending}
          title="Stop Timer"
        >
          <StopCircle className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Timer Active on Another Task
        </Button>
      )}
    </div>
  );
}