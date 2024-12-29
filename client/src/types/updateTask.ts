import { z } from "zod";

export const updateTaskSchema = z.object({
  taskId: z.number(),
  completed: z.boolean().optional(),
  title: z.string().optional(),
  estimatedMinutes: z.number().optional(),
  plannedDate: z.string().nullable().optional(),
  isSubtask: z.boolean().optional(),
  parentTaskId: z.number().nullable().optional(),
  notes: z.array(z.string()).optional(),
});

export type UpdateTask = z.infer<typeof updateTaskSchema>;
