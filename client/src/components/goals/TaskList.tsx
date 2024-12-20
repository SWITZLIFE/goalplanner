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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface SortableTaskProps {
  task: Task;
  children: React.ReactNode;
  disabled?: boolean;
}

function SortableTask({ task, children, disabled = false }: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `task-${task.id}`,
    disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "rounded-md",
        isDragging && "opacity-50",
        !disabled && "cursor-grab active:cursor-grabbing"
      )}
    >
      {children}
    </div>
  );
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      const existingOrders = mainTasks.map(t => t.order ?? 0);
      const minOrder = existingOrders.length ? Math.min(...existingOrders) : 0;
      const newTask = await createTask({
        goalId,
        title: "New Task",
        isSubtask: false,
        plannedDate: undefined,
        order: minOrder - 1000,
      });
      setEditingTaskId(newTask.id);
      setExpandedTasks(new Set(Array.from(expandedTasks).concat([newTask.id])));
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      const activeId = parseInt(active.id.toString().split('-')[1]);
      const overId = parseInt(over.id.toString().split('-')[1]);
      
      const activeTask = tasks.find(t => t.id === activeId);
      const overTask = tasks.find(t => t.id === overId);
      
      if (!activeTask || !overTask || activeTask.isSubtask !== overTask.isSubtask) {
        return;
      }

      // Get the relevant tasks (either main tasks or subtasks of the same parent)
      const relevantTasks = activeTask.isSubtask
        ? tasks.filter(t => t.isSubtask && t.parentTaskId === activeTask.parentTaskId)
        : tasks.filter(t => !t.isSubtask);

      const oldIndex = relevantTasks.findIndex(t => t.id === activeId);
      const newIndex = relevantTasks.findIndex(t => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTasks = arrayMove(relevantTasks, oldIndex, newIndex);

        // Calculate new orders with larger gaps to prevent conflicts
        const startOrder = 1000;
        const orderGap = 2000;

        // Update orders for all affected tasks
        for (let i = 0; i < reorderedTasks.length; i++) {
          const task = reorderedTasks[i];
          const newOrder = startOrder + (i * orderGap);
          if (task.order !== newOrder) {
            await updateTask({
              taskId: task.id,
              order: newOrder,
            });
          }
        }
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
      setExpandedTasks(new Set(Array.from(expandedTasks).concat([parentTaskId])));
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={mainTasks.map(task => `task-${task.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {mainTasks.map((mainTask) => (
                <SortableTask 
                  key={mainTask.id} 
                  task={mainTask}
                  disabled={readOnly}
                >
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 group">
                        {!readOnly && (
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                        )}
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
                          <div className="flex items-center gap-2">
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
                            {mainTask.totalMinutesSpent > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Time spent: {formatTime(mainTask.totalMinutesSpent)}
                              </span>
                            )}
                          </div>
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
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={getOrderedSubtasks(mainTask.id).map(task => `task-${task.id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {getOrderedSubtasks(mainTask.id).map((subtask) => (
                                <SortableTask 
                                  key={subtask.id} 
                                  task={subtask}
                                  disabled={readOnly}
                                >
                                  <div className="flex items-center space-x-2 group">
                                    {!readOnly && (
                                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                                    )}
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
                                </SortableTask>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  </div>
                </SortableTask>
              ))}
            </div>
          </SortableContext>
        </DndContext>

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
