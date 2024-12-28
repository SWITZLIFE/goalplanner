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

  // Query current active timer
  const { data: activeTimer } = useQuery<ActiveTimer | null>({
    queryKey: ["/api/timer/current"],
    refetchInterval: 1000,
    staleTime: 0,
  });

  // Start timer mutation
  const startTimer = useMutation({
    mutationFn: async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/timer/start`, {
          method: "POST",
          credentials: "include",
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error === "Another timer is already running") {
            toast({
              title: "Timer Error",
              description: "Another timer is already running. Please stop it first.",
              variant: "destructive",
            });
          }
          throw new Error(data.error || "Failed to start timer");
        }

        return data;
      } catch (error: any) {
        throw new Error(error.message || "Failed to start timer");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timer/current"] });
      toast({
        title: "Timer Started",
        description: "Time tracking has begun for this task",
      });
    },
    onError: (error) => {
      if (error.message !== "Another timer is already running") {
        toast({
          title: "Failed to start timer",
          description: error instanceof Error ? error.message : "Something went wrong",
          variant: "destructive",
        });
      }
    },
  });

  // Stop timer mutation
  const stopTimer = useMutation({
    mutationFn: async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/timer/stop`, {
          method: "POST",
          credentials: "include",
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to stop timer");
        }

        return data as TimerResponse;
      } catch (error: any) {
        throw new Error(error.message || "Failed to stop timer");
      }
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

  // Update elapsed time
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (activeTimer?.taskId === taskId && activeTimer?.isActive) {
      const startTime = new Date(activeTimer.startTime).getTime();
      intervalId = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeTimer, taskId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimerRunningForTask = activeTimer?.taskId === taskId && activeTimer?.isActive;
  const isAnyTimerRunning = activeTimer?.isActive;

  return (
    <div className="flex items-center gap-2">
      {isTimerRunningForTask && (
        <div className="font-mono text-lg">
          {formatTime(elapsedTime)}
        </div>
      )}
      {!isAnyTimerRunning ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startTimer.mutate()}
          disabled={startTimer.isPending}
          title="Start Timer"
        >
          <Timer className="h-4 w-4" />
        </Button>
      ) : isTimerRunningForTask ? (
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
        <Button variant="outline" size="sm" disabled title="Another timer is running">
          Timer Active
        </Button>
      )}
    </div>
  );
}