import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronRight, GripVertical } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { TaskTimer } from "./TaskTimer";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, type DropResult } from "react-beautiful-dnd";
import { StrictModeDroppable } from "./StrictModeDroppable";

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
      // Create task at the beginning of the list
      const existingOrders = mainTasks.map(t => t.order ?? 0);
      const minOrder = existingOrders.length ? Math.min(...existingOrders) : 0;
      const newTask = await createTask({
        goalId,
        title: "New Task",
        isSubtask: false,
        order: minOrder - 1000,
      });
      setEditingTaskId(newTask.id);
      // Expand the task list when adding a new task
      setExpandedTasks(new Set([...expandedTasks, newTask.id]));
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    try {
      const reorderTasks = async (tasks: Task[]) => {
        // Get the task being moved
        const taskId = parseInt(result.draggableId.split('-')[1]);
        const movedTask = tasks.find(t => t.id === taskId);
        
        if (!movedTask) return;

        // Create a new array with the task moved to its new position
        const reorderedTasks = Array.from(tasks);
        reorderedTasks.splice(sourceIndex, 1);
        reorderedTasks.splice(destinationIndex, 0, movedTask);

        // Normalize orders to prevent floating-point issues
        const normalizedTasks = reorderedTasks.map((task, index) => ({
          ...task,
          order: (index + 1) * 1000
        }));

        // Only update the tasks that actually changed position
        const start = Math.min(sourceIndex, destinationIndex);
        const end = Math.max(sourceIndex, destinationIndex);
        
        for (let i = start; i <= end; i++) {
          const task = normalizedTasks[i];
          if (task.order !== reorderedTasks[i].order) {
            await updateTask({
              taskId: task.id,
              order: task.order,
            });
          }
        }
      };

      // Handle main tasks and subtasks separately
      if (result.type === "MAIN_TASK") {
        // Only reorder main tasks
        const mainTasksOnly = tasks.filter(t => !t.isSubtask);
        await reorderTasks(mainTasksOnly);
      } else if (result.type.startsWith("SUBTASK-")) {
        // Only reorder subtasks within the same parent
        const parentId = parseInt(result.type.split('-')[1]);
        const subtasksOnly = tasks.filter(t => t.isSubtask && t.parentTaskId === parentId);
        await reorderTasks(subtasksOnly);
      }
    } catch (error) {
      console.error("Failed to update task order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task order"
      });
    }
  };

  const handleAddSubtask = async (parentTaskId: number) => {
    try {
      const subtasks = getOrderedSubtasks(parentTaskId);
      const minOrder = subtasks.length ? Math.min(...subtasks.map(t => t.order ?? 0)) : 0;
      const newSubtask = await createTask({
        goalId,
        title: "New Subtask",
        isSubtask: true,
        parentTaskId,
        order: minOrder - 1000,
      });
      setEditingTaskId(newSubtask.id);
      // Expand the parent task when adding a new subtask
      setExpandedTasks(new Set([...expandedTasks, parentTaskId]));
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
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const getOrderedSubtasks = (parentId: number) => {
    return tasks
      .filter(task => task.parentTaskId === parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
              const newExpanded = new Set(expandedTasks);
              
              // If any tasks are expanded, collapse all. Otherwise, expand all
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

        <DragDropContext onDragEnd={handleDragEnd}>
          <StrictModeDroppable droppableId="main-tasks" type="MAIN_TASK">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn("space-y-2", snapshot.isDraggingOver && "bg-accent/50")}
              >
                {mainTasks.map((mainTask, index) => (
                  <Draggable
                    key={mainTask.id}
                    draggableId={`task-${mainTask.id}`}
                    index={index}
                    isDragDisabled={readOnly}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="space-y-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 group">
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            {/* Toggle icon for collapsible */}
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
                            <div className="flex items-center gap-2 flex-grow">
                              <EditableTaskTitle
                                task={mainTask}
                                onSave={(title) => handleTaskTitleChange(mainTask.id, title)}
                                className={cn(
                                  "font-medium",
                                  mainTask.completed && "line-through text-muted-foreground"
                                )}
                              />
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
                                  size="icon"
                                  onClick={() => handleAddSubtask(mainTask.id)}
                                  title="Add Subtask"
                                >
                                  <Plus className="h-4 w-4" />
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
                            {!readOnly && mainTask.plannedDate && (
                              <div className="text-xs text-primary">
                                📅 {format(new Date(mainTask.plannedDate), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        </div>

                        <Collapsible.Root 
                          open={expandedTasks.has(mainTask.id)}
                          className="ml-6 space-y-2"
                        >
                          <Collapsible.Content className="transition-all data-[state=closed]:animate-collapse data-[state=open]:animate-expand overflow-hidden">
                            <StrictModeDroppable 
                              droppableId={`subtasks-${mainTask.id}`} 
                              type={`SUBTASK-${mainTask.id}`}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={cn("space-y-2", snapshot.isDraggingOver && "bg-accent/50")}
                                >
                                  {getOrderedSubtasks(mainTask.id).map((subtask, index) => (
                                    <Draggable
                                      key={subtask.id}
                                      draggableId={`subtask-${subtask.id}`}
                                      index={index}
                                      isDragDisabled={readOnly}
                                    >
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className="flex items-center space-x-2 group"
                                        >
                                          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                          <Checkbox
                                            id={`task-${subtask.id}`}
                                            checked={subtask.completed}
                                            onCheckedChange={(checked) => handleTaskToggle(subtask.id, checked as boolean)}
                                          />
                                          <div className="flex flex-col flex-grow">
                                            <div className="flex items-center gap-2">
                                              <EditableTaskTitle
                                                task={subtask}
                                                onSave={(title) => handleTaskTitleChange(subtask.id, title)}
                                                className={cn(
                                                  "text-sm",
                                                  subtask.completed && "line-through text-muted-foreground"
                                                )}
                                              />
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
                                            {subtask.estimatedMinutes && (
                                              <span className="text-xs text-muted-foreground">
                                                Estimated time: {subtask.estimatedMinutes} minutes
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </StrictModeDroppable>
                          </Collapsible.Content>
                        </Collapsible.Root>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </StrictModeDroppable>
        </DragDropContext>

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
    </>
  );
}
