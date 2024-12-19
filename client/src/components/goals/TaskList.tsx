import { Checkbox } from "@/components/ui/checkbox";
import type { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  const { updateTask } = useGoals();

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    await updateTask({ taskId, completed });
  };

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center space-x-2">
          <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
          />
          <label
            htmlFor={`task-${task.id}`}
            className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}
          >
            {task.title}
          </label>
        </div>
      ))}
    </div>
  );
}
