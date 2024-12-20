import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  const [isEditing, setIsEditing] = useState(false);
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
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<number, string>>({});

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    await updateTask({ taskId, completed });
  };

  const handleTaskTitleChange = async (taskId: number, title: string) => {
    await updateTask({ taskId, title });
  };

  const handleAddTask = async (title: string) => {
    if (title.trim()) {
      try {
        await createTask({
          goalId,
          title: title.trim(),
          isSubtask: false,
        });
        setNewTaskTitle("");
      } catch (error) {
        console.error("Failed to create task:", error);
      }
    }
  };

  const handleAddSubtask = async (parentTaskId: number, title: string) => {
    if (title.trim()) {
      try {
        await createTask({
          goalId,
          title: title.trim(),
          isSubtask: true,
          parentTaskId,
        });
        setNewSubtaskTitles(prev => ({ ...prev, [parentTaskId]: "" }));
      } catch (error) {
        console.error("Failed to create subtask:", error);
      }
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
            {/* Add subtask input */}
              <Input
                value={newSubtaskTitles[mainTask.id] || ""}
                onChange={(e) => setNewSubtaskTitles(prev => ({ 
                  ...prev, 
                  [mainTask.id]: e.target.value 
                }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSubtaskTitles[mainTask.id]) {
                    handleAddSubtask(mainTask.id, newSubtaskTitles[mainTask.id]);
                  }
                }}
                placeholder="Add subtask..."
                className="mt-2 h-7"
              />
            </div>
          </div>
        );
      })}

      {/* Add new task input */}
      <Input
        value={newTaskTitle}
        onChange={(e) => setNewTaskTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && newTaskTitle) {
            handleAddTask(newTaskTitle);
          }
        }}
        placeholder="Add new task..."
        className="mt-4 h-8"
      />
    </div>
  );
}
