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

  const { data: activeTimer } = useQuery<ActiveTimer | null>({
    queryKey: ["/api/timer/current"],
    refetchInterval: 1000,
    staleTime: 0,
    enabled: !!taskId,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
    onError: (error: any) => {
      // Only show error toast for non-auth errors
      if (error?.response?.status !== 401) {
        toast({
          title: "Error",
          description: "Failed to fetch timer status",
          variant: "destructive",
        });
      }
    }
  });

  const startTimer = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/timer/start`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || "Failed to start timer");
      }

      return res.json() as Promise<ActiveTimer>;
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

  const stopTimer = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/timer/stop`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || "Failed to stop timer");
      }

      const data: TimerResponse = await res.json();
      return data;
    },
    onSuccess: (data) => {
      setElapsedTime(0);
      onTimerStop?.(data.coinsEarned);
      queryClient.invalidateQueries({ queryKey: ["/api/timer/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });

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

  useEffect(() => {
    if (activeTimer?.taskId === taskId && activeTimer?.isActive) {
      const startTime = new Date(activeTimer.startTime).getTime();
      const updateInterval = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);

      return () => clearInterval(updateInterval);
    } else {
      setElapsedTime(0);
    }
  }, [activeTimer, taskId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentTask = activeTimer?.taskId === taskId;

  return (
    <div className="flex items-center gap-2">
      {isCurrentTask && activeTimer?.isActive && (
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