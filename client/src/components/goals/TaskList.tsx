import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";

interface TaskListProps {
  tasks: Task[];
  goalId: number;
}

interface EditableTaskTitleProps {
  task: Task;
  onSave: (title: string) => void;
  className?: string;
}

function EditableTaskTitle({ task, onSave, className }: EditableTaskTitleProps) {
  const [isEditing, setIsEditing] = useState(task.title === "New Task" || task.title === "New Subtask");
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (title.trim() !== task.title) {
      onSave(title.trim());
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setTitle(task.title);
            setIsEditing(false);
          }
        }}
        className={cn("h-6 py-0 px-1", className)}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn("cursor-text", className)}
    >
      {task.title}
    </div>
  );
}

export function TaskList({ tasks, goalId }: TaskListProps) {
  const { updateTask, createTask } = useGoals();
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    await updateTask({ taskId, completed });
  };

  const handleTaskTitleChange = async (taskId: number, title: string) => {
    if (title.trim()) {
      await updateTask({ taskId, title });
    } else {
      // If the title is empty after editing, delete the task
      // This will be implemented in the next step
    }
    setEditingTaskId(null);
  };

  const handleAddTask = async () => {
    try {
      const newTask = await createTask({
        goalId,
        title: "New Task",
        isSubtask: false,
      });
      // Set the new task in edit mode
      setEditingTaskId(newTask.id);
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleAddSubtask = async (parentTaskId: number) => {
    try {
      const newSubtask = await createTask({
        goalId,
        title: "New Subtask",
        isSubtask: true,
        parentTaskId,
      });
      // Set the new subtask in edit mode
      setEditingTaskId(newSubtask.id);
    } catch (error) {
      console.error("Failed to create subtask:", error);
    }
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
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddTask}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

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
                <EditableTaskTitle
                  task={mainTask}
                  onSave={(title) => handleTaskTitleChange(mainTask.id, title)}
                  className={cn(
                    "font-medium flex-grow",
                    mainTask.completed && "line-through text-muted-foreground"
                  )}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddSubtask(mainTask.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subtask
                </Button>
              </div>
              {subtasks.some(task => task.estimatedMinutes) && (
                <div className="text-xs text-muted-foreground ml-6">
                  Total estimated time: {
                    formatTime(
                      subtasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0)
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
                  <div className="flex flex-col flex-grow">
                    <EditableTaskTitle
                      task={subtask}
                      onSave={(title) => handleTaskTitleChange(subtask.id, title)}
                      className={cn(
                        "text-sm",
                        subtask.completed && "line-through text-muted-foreground"
                      )}
                    />
                    {subtask.estimatedMinutes && (
                      <span className="text-xs text-muted-foreground">
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
