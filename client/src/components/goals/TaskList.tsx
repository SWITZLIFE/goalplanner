import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { TaskTimer } from "./TaskTimer";
import { useToast } from "@/hooks/use-toast";

interface TaskListProps {
  tasks: Task[];
  goalId: number;
  readOnly?: boolean;
  onUpdateTaskDate?: (taskId: number, date: Date | undefined) => Promise<void>;
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

export function TaskList({ tasks, goalId, readOnly = false, onUpdateTaskDate }: TaskListProps) {
  const { updateTask, createTask } = useGoals();
  const { toast } = useToast();
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<{ taskId: number; date?: Date } | null>(null);

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    await updateTask({ taskId, completed });
  };

  const parseEstimatedTime = (title: string): { title: string; estimatedMinutes?: number } => {
    const timePattern = /\(est:(\d+)m\)/;
    const match = title.match(timePattern);
    
    if (match) {
      const minutes = parseInt(match[1], 10);
      const cleanTitle = title.replace(timePattern, '').trim();
      return { title: cleanTitle, estimatedMinutes: minutes };
    }
    
    return { title };
  };

  const handleTaskTitleChange = async (taskId: number, title: string) => {
    if (title.trim()) {
      const { title: cleanTitle, estimatedMinutes } = parseEstimatedTime(title);
      await updateTask({ taskId, title: cleanTitle, estimatedMinutes });
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
      setEditingTaskId(newSubtask.id);
    } catch (error) {
      console.error("Failed to create subtask:", error);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const mainTasks = tasks
    .filter(task => !task.isSubtask)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
  const getOrderedSubtasks = (parentId: number) => {
    return tasks
      .filter(task => task.parentTaskId === parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };
  
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
                {!mainTask.completed && (
                  <TaskTimer 
                    taskId={mainTask.id}
                    totalMinutesSpent={mainTask.totalMinutesSpent || 0}
                    onTimerStop={(coinsEarned) => {
                      toast({
                        title: "Time Tracked!",
                        description: `You earned ${coinsEarned} coins for your work.`
                      });
                    }}
                  />
                )}
                {!readOnly && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddSubtask(mainTask.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subtask
                    </Button>
                    {onUpdateTaskDate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDatePicker({ taskId: mainTask.id, date: mainTask.plannedDate ? new Date(mainTask.plannedDate) : undefined })}
                      >
                        {mainTask.plannedDate 
                          ? format(new Date(mainTask.plannedDate), 'dd/MM/yy')
                          : "Set Date"
                        }
                      </Button>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-between items-center ml-6">
                <div className="text-xs space-x-2">
                  {subtasks.some(task => task.estimatedMinutes) && (
                    <span className="text-muted-foreground">
                      Total estimated time: {
                        formatTime(
                          subtasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0)
                        )
                      }
                    </span>
                  )}
                  {mainTask.totalMinutesSpent > 0 && (
                    <span className="text-blue-500">
                      (Actual: {formatTime(mainTask.totalMinutesSpent)})
                    </span>
                  )}
                </div>
                {!readOnly && mainTask.plannedDate && (
                  <div className="text-xs text-primary">
                    📅 {format(new Date(mainTask.plannedDate), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            </div>
            
            <div className="ml-6 space-y-2">
              {getOrderedSubtasks(mainTask.id).map((subtask) => (
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
                        Estimated time: {formatTime(subtask.estimatedMinutes)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      
      <Dialog 
        open={showDatePicker !== null} 
        onOpenChange={(open) => !open && setShowDatePicker(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Task Date</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={showDatePicker?.date}
            onSelect={(date) => {
              if (showDatePicker && onUpdateTaskDate) {
                onUpdateTaskDate(showDatePicker.taskId, date);
                setShowDatePicker(null);
              }
            }}
            className="rounded-md border"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
