import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Goal, NewGoal, Task, NewTask } from "@db/schema";

interface CreateTaskParams {
  goalId: number;
  title: string;
  isSubtask?: boolean;
  parentTaskId?: number;
  plannedDate?: string;
  order?: number;
}

export function useGoals() {
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goal: NewGoal) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal),
      });
      if (!res.ok) throw new Error("Failed to create goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      const res = await fetch(`/api/goals/${params.goalId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: params.title,
          isSubtask: params.isSubtask,
          parentTaskId: params.parentTaskId,
          plannedDate: params.plannedDate,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      completed, 
      title,
      estimatedMinutes,
      plannedDate,
      order
    }: { 
      taskId: number; 
      completed?: boolean; 
      title?: string;
      estimatedMinutes?: number;
      plannedDate?: string | null;
      order?: number;
    }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed, title, estimatedMinutes, plannedDate, order }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  return {
    goals,
    isLoading,
    createGoal: createGoalMutation.mutateAsync,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
  };
}
