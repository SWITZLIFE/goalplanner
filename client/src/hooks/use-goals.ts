
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Goal, NewGoal, Task, NewTask } from "@db/schema";

export function useGoals() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch("/api/goals", {
        credentials: 'include' // Include credentials for auth
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Please login to view your goals");
        }
        throw new Error("Failed to fetch goals");
      }
      const data = await res.json();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000 // Cache for 30 seconds
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ 
      goalId, 
      title,
      description,
      targetDate,
      visionStatement
    }: { 
      goalId: number;
      title?: string;
      description?: string;
      targetDate?: string;
      visionStatement?: string;
    }) => {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, targetDate, visionStatement }),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", user?.id] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/goals", user?.id] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (params: { 
      goalId: number; 
      title: string; 
      isSubtask?: boolean; 
      parentTaskId?: number;
      plannedDate?: string;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/goals", user?.id] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      completed, 
      title,
      estimatedMinutes,
      plannedDate,
      notes,
      isSubtask,
      parentTaskId,
      goalId
    }: { 
      taskId: number; 
      completed?: boolean; 
      title?: string;
      estimatedMinutes?: number;
      plannedDate?: string | null;
      notes?: string | null;
      isSubtask?: boolean;
      parentTaskId?: number | null;
      goalId?: number;
    }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          completed, 
          title, 
          estimatedMinutes, 
          plannedDate, 
          notes,
          isSubtask,
          parentTaskId,
          goalId
        }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/goals", user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/goals", user?.id] });
    },
  });

  return {
    goals,
    isLoading,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
  };
}
