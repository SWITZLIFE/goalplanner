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

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes} minutes`;
  };

  const mainTasks = tasks.filter(task => !task.isSubtask);
  
  return (
    <div className="space-y-6">
      {mainTasks.map((mainTask) => {
        const subtasks = tasks.filter(task => task.parentTaskId === mainTask.id);
        
        return (
          <div key={mainTask.id} className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`task-${mainTask.id}`}
                  checked={mainTask.completed}
                  onCheckedChange={(checked) => handleTaskToggle(mainTask.id, checked as boolean)}
                />
                <label
                  htmlFor={`task-${mainTask.id}`}
                  className={`font-medium ${mainTask.completed ? "line-through text-muted-foreground" : ""}`}
                >
                  {mainTask.title}
                </label>
              </div>
              {tasks.filter(task => task.parentTaskId === mainTask.id).some(task => task.estimatedMinutes) && (
                <div className="text-xs text-muted-foreground ml-6">
                  Total estimated time: {
                    formatTime(
                      tasks
                        .filter(task => task.parentTaskId === mainTask.id)
                        .reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0)
                    )
                  }
                </div>
              )}
            </div>
            
            <div className="ml-6 space-y-2">
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`task-${subtask.id}`}
                    checked={subtask.completed}
                    onCheckedChange={(checked) => handleTaskToggle(subtask.id, checked as boolean)}
                  />
                  <div className="flex flex-col">
                    <label
                      htmlFor={`task-${subtask.id}`}
                      className={`text-sm ${subtask.completed ? "line-through text-muted-foreground" : ""}`}
                    >
                      {subtask.title}
                    </label>
                    {subtask.estimatedMinutes && (
                      <span className="text-xs text-muted-foreground ml-4">
                        Estimated time: {subtask.estimatedMinutes} minutes
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
