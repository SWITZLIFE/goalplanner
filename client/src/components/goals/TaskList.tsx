import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronRight, StickyNote } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { TaskTimer } from "./TaskTimer";
import { TaskEditor } from "./TaskEditor";
import { useToast } from "@/hooks/use-toast";

interface TaskListProps {
  tasks: Task[];
  goalId: number;
  readOnly?: boolean;
  onUpdateTaskDate?: (taskId: number, date: Date | undefined) => Promise<void>;
}

interface EditableTaskTitleProps {
  task: Task;
  onSave: (title: string, createAnother?: boolean) => void;
  className?: string;
  continuousCreate?: boolean;
}

function EditableTaskTitle({ task, onSave, className, continuousCreate }: EditableTaskTitleProps) {
  const [isEditing, setIsEditing] = useState(task.title === "New Task" || task.title === "New Subtask");
  const [title, setTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = (createAnother = false) => {
    const isUnedited = title === task.title && (title === "New Task" || title === "New Subtask");
    if (title.trim() && !isUnedited) {
      onSave(title.trim(), createAnother);
    } else if (isUnedited) {
      // If it's a new task/subtask and wasn't edited, treat it as a cancellation
      onSave('', false);
    }
    if (!createAnother || isUnedited) {
      setIsEditing(false);
    } else {
      setTitle('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => handleSave(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (continuousCreate) {
              handleSave(true);
            } else {
              handleSave(false);
            }
          }
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
  const { updateTask, createTask, deleteTask } = useGoals();
  const { toast } = useToast();
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<{ taskId: number; date?: Date } | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const handleDelete = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      toast({
        title: "Success",
        description: "Task deleted successfully"
      });
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete task"
      });
    }
  };

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      // Update the main task
      await updateTask({ taskId, completed });
      
      // If this is a main task, update all its subtasks
      if (!task.isSubtask && completed) {
        const subtasks = tasks.filter(t => t.parentTaskId === taskId);
        await Promise.all(
          subtasks.map(subtask => 
            updateTask({ taskId: subtask.id, completed: true })
          )
        );
      }
      
      toast({
        title: "Success",
        description: completed ? "Task completed!" : "Task reopened"
      });
    } catch (error) {
      console.error("Failed to update task completion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status"
      });
    }
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

  const handleTaskTitleChange = async (taskId: number, title: string, createAnother = false) => {
    const task = tasks.find(t => t.id === taskId);
    
    if (!title) {
      // Empty title means the user didn't edit the new task/subtask, so delete it
      if (task && (task.title === "New Task" || task.title === "New Subtask")) {
        await deleteTask(taskId);
      }
    } else if (title.trim()) {
      const { title: cleanTitle, estimatedMinutes } = parseEstimatedTime(title);
      await updateTask({ taskId, title: cleanTitle, estimatedMinutes });
      
      if (createAnother && task?.parentTaskId) {
        await handleAddSubtask(task.parentTaskId);
      }
    }
    
    if (!createAnother) {
      setEditingTaskId(null);
    }
  };

  const handleAddTask = async () => {
    try {
      const newTask = await createTask({
        goalId,
        title: "New Task",
        isSubtask: false,
      });
      setExpandedTasks(new Set([...Array.from(expandedTasks), newTask.id]));
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
      setExpandedTasks(new Set([...Array.from(expandedTasks), parentTaskId]));
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
    return `${hours}h ${remainingMinutes}m`;
  };

  const mainTasks = tasks
    .filter(task => !task.isSubtask)
    .sort((a, b) => {
      // If both tasks are AI-generated or both are manually created, sort by ID ascending
      // Otherwise, manually created tasks go to the top
      if ((a.isAiGenerated && b.isAiGenerated) || (!a.isAiGenerated && !b.isAiGenerated)) {
        return a.isAiGenerated ? b.id - a.id : b.id - a.id;
      }
      return a.isAiGenerated ? 1 : -1;
    });

  const getOrderedSubtasks = (parentId: number) => {
    return tasks
      .filter(task => task.parentTaskId === parentId)
      .sort((a, b) => a.id - b.id); // Changed to ascending order
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
            const mainTaskIds = mainTasks.map(task => task.id);
            const newExpanded = new Set(Array.from(expandedTasks));
            const shouldExpandAll = mainTaskIds.some(id => !expandedTasks.has(id));
            
            mainTaskIds.forEach(id => {
              if (shouldExpandAll) {
                newExpanded.add(id);
              } else {
                newExpanded.delete(id);
              }
            });
            
            setExpandedTasks(newExpanded);
          }}
          >
            {mainTasks.some(task => !expandedTasks.has(task.id)) ? 'Expand All' : 'Collapse All'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTask}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        <div className="space-y-2">
          {mainTasks.map((mainTask) => (
            <div key={mainTask.id} className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      const newExpanded = new Set(expandedTasks);
                      if (expandedTasks.has(mainTask.id)) {
                        newExpanded.delete(mainTask.id);
                      } else {
                        newExpanded.add(mainTask.id);
                      }
                      setExpandedTasks(newExpanded);
                    }}
                  >
                    <ChevronRight 
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expandedTasks.has(mainTask.id) ? "transform rotate-90" : ""
                      )}
                    />
                  </Button>
                  <Checkbox
                    id={`task-${mainTask.id}`}
                    checked={mainTask.completed}
                    onCheckedChange={(checked) => handleTaskToggle(mainTask.id, checked as boolean)}
                  />
                  <div 
                    className="flex items-center gap-2 flex-grow cursor-pointer"
                    onClick={(e) => {
                      // Only open task details if clicking the container, not the title or buttons
                      if (e.target === e.currentTarget) {
                        setEditingTaskId(mainTask.id);
                      }
                    }}
                  >
                    <EditableTaskTitle
                      task={mainTask}
                      onSave={(title) => handleTaskTitleChange(mainTask.id, title)}
                      className={cn(
                        "font-medium",
                        mainTask.completed && "line-through text-muted-foreground"
                      )}
                    />
                    <div className="flex items-center gap-1">
                        {!mainTask.isSubtask && mainTask.notes && (
                          <button
                            onClick={() => setEditingTaskId(mainTask.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="View notes"
                          >
                            <StickyNote className="h-4 w-4" />
                          </button>
                        )}
                      {!readOnly && (
                        <button
                          onClick={() => handleDelete(mainTask.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
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
                  {!readOnly && onUpdateTaskDate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDatePicker({ 
                            taskId: mainTask.id, 
                            date: mainTask.plannedDate ? new Date(mainTask.plannedDate) : undefined 
                          })}
                        >
                          {mainTask.plannedDate 
                            ? format(new Date(mainTask.plannedDate), 'MMM d, yyyy')
                            : "Set Date"
                          }
                        </Button>
                      )}
                </div>

                <div className="flex justify-between items-center ml-6">
                  <div className="flex gap-2 text-xs">
                    <div className="text-muted-foreground">
                      {(getOrderedSubtasks(mainTask.id).some(task => task.estimatedMinutes) || mainTask.totalMinutesSpent > 0) && (
                        <div className="flex items-center gap-2">
                          <span>
                            {getOrderedSubtasks(mainTask.id).some(task => task.estimatedMinutes) && (
                              <>
                                Total estimated time: {
                                  formatTime(
                                    getOrderedSubtasks(mainTask.id).reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0)
                                  )
                                }
                              </>
                            )}
                          </span>
                          {mainTask.totalMinutesSpent > 0 && (
                            <span className="text-blue-500 font-medium">
                              (Actual: {String(Math.floor(mainTask.totalMinutesSpent / 60)).padStart(2, '0')}:{String(mainTask.totalMinutesSpent % 60).padStart(2, '0')})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Date is now shown in the Set Date button */}
                </div>
              </div>

              <Collapsible.Root 
                open={expandedTasks.has(mainTask.id)}
                className="ml-10 border-l-2 border-gray-200 pl-4 mt-2"
              >
                <Collapsible.Content className="transition-all data-[state=closed]:animate-collapse data-[state=open]:animate-expand overflow-hidden">
                  <div className="space-y-2">
                    {getOrderedSubtasks(mainTask.id).map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center space-x-2 group"
                      >
                        <Checkbox
                          id={`task-${subtask.id}`}
                          checked={subtask.completed}
                          onCheckedChange={(checked) => handleTaskToggle(subtask.id, checked as boolean)}
                        />
                        <div className="flex flex-col flex-grow">
                          <div className="flex items-center gap-2">
                            <EditableTaskTitle
                              task={subtask}
                              onSave={(title, createAnother) => handleTaskTitleChange(subtask.id, title, createAnother)}
                              className={cn(
                                "text-sm",
                                subtask.completed && "line-through text-muted-foreground"
                              )}
                              continuousCreate={true}
                            />
                            <div className="flex items-center gap-1">
                              {!subtask.isSubtask && subtask.notes && (
                                <button
                                  onClick={() => setEditingTaskId(subtask.id)}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                  title="View notes"
                                >
                                  <StickyNote className="h-4 w-4" />
                                </button>
                              )}
                              {!readOnly && (
                                <button
                                  onClick={() => handleDelete(subtask.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                                  title="Delete subtask"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          {subtask.estimatedMinutes && (
                            <span className="text-xs text-muted-foreground">
                              Estimated time: {subtask.estimatedMinutes} minutes
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Hover area for adding new subtask */}
                    {!readOnly && (
                      <div 
                        className="flex items-center space-x-2 group h-8 px-8 -ml-6 cursor-pointer hover:bg-accent/50 rounded-sm"
                        onClick={() => handleAddSubtask(mainTask.id)}
                      >
                        <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          Add subtask
                        </span>
                      </div>
                    )}
                  </div>
                </Collapsible.Content>
              </Collapsible.Root>
            </div>
          ))}
        </div>

        {/* Date Picker Dialog */}
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

      {/* Task Editor Dialog - only for main tasks */}
      {editingTaskId && tasks.find(t => t.id === editingTaskId && !t.isSubtask) && (
        <TaskEditor
          task={tasks.find(t => t.id === editingTaskId)!}
          open={!!editingTaskId}
          onOpenChange={(open) => !open && setEditingTaskId(null)}
        />
      )}
    </>
  );
}