import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "./TaskList";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Task as BaseTask } from "@db/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Calendar as CalendarIcon, Quote, X, Link2, Plus, ChevronRight } from "lucide-react";
import { VisionGenerator } from "./VisionGenerator";
import { OverdueTasksDialog } from "./OverdueTasksDialog";
import { useQuery } from "@tanstack/react-query"; 
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Checkbox } from "@/components/ui/checkbox";

// Extend the Task type to include properties needed for the task list dialog
interface Task extends BaseTask {
  isTaskList?: boolean;
  dayTasks?: Task[];
  updatedAt?: string;
}

// Add Note type definition
interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  totalTasks: number;
  visionStatement: string | null;
  visionResponses: string | null;
  tasks: Task[];
}

interface TaskViewsProps {
  tasks: Task[];
  goalId: number;
  goal: Goal;
}

interface TaskDialogProps {
  task: Task;
  onClose: () => void;
  onUpdateDate: (date: Date | undefined) => void;
  onToggleComplete: (completed: boolean, subtaskId?: number) => void;
  initialTasks: Task[];
}

function TaskDialog({ task, onClose, onUpdateDate, onToggleComplete, initialTasks }: TaskDialogProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Get subtasks directly from the task list
  const subtasks = task.isTaskList && task.dayTasks
    ? task.dayTasks
    : initialTasks.filter(t => t.parentTaskId === task.id && t.isSubtask);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={task.completed}
                onCheckedChange={(checked) => onToggleComplete(checked as boolean)}
              />
              <span className={cn(
                task.completed && "line-through text-muted-foreground"
              )}>{task.title}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {task.plannedDate
                  ? format(new Date(task.plannedDate), 'MMMM d, yyyy')
                  : "No date set"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(true)}
            >
              Change Date
            </Button>
          </div>

          {/* Time Estimate */}
          {task.estimatedMinutes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Estimated: {task.estimatedMinutes} minutes</span>
            </div>
          )}

          {/* Subtasks Section */}
          {subtasks.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-2">
                {task.isTaskList ? "Tasks" : "Subtasks"}
              </h3>
              <div className="space-y-2">
                {subtasks.map(subtask => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={(checked) =>
                        onToggleComplete(checked as boolean, subtask.id)
                      }
                    />
                    <span className={cn(
                      "text-sm",
                      subtask.completed && "line-through text-muted-foreground"
                    )}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Picker Dialog */}
        <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Select New Date</DialogTitle>
            </DialogHeader>
            <Calendar
              mode="single"
              selected={task.plannedDate ? new Date(task.plannedDate) : undefined}
              onSelect={(date) => {
                onUpdateDate(date || undefined);
                setShowDatePicker(false);
              }}
              className="rounded-md border"
            />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export function TaskViews({ tasks: initialTasks, goalId, goal }: TaskViewsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [goalFilter, setGoalFilter] = useState<number | 'all'>('all');
  const [showDatePicker, setShowDatePicker] = useState<{ taskId: number; date?: Date } | null>(null);
  const [showOverdueTasks, setShowOverdueTasks] = useState(true);
  const { updateTask, createTask, updateGoal, goals } = useGoals();
  const { toast } = useToast();
  const [selectedNote, setSelectedNote] = useState<(Task | Note) | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch standalone notes
  const { data: standaloneNotes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  // Get overdue tasks
  const overdueTasks = initialTasks.filter(task => {
    if (!task.plannedDate || task.completed) return false;
    const taskDate = new Date(task.plannedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate < today;
  });

  // Get all tasks from all goals
  const allTasks = goals.reduce<Task[]>((acc, g) => {
    if (g.tasks) {
      return [...acc, ...g.tasks as Task[]];
    }
    return acc;
  }, []);

  // Get all main tasks (non-subtasks) from the current goal's tasks
  const mainTasks = initialTasks.filter(task => !task.isSubtask);

  // Get subtasks for a given parent task from the current goal's tasks
  const getSubtasks = (parentId: number) => initialTasks.filter(task => task.parentTaskId === parentId);

  // Split main tasks into active and completed
  const activeMainTasks = mainTasks.filter(task => !task.completed);
  const completedMainTasks = mainTasks.filter(task => task.completed);

  // For active view: Include active main tasks and ALL their subtasks
  const activeTasks = [
    ...activeMainTasks,
    ...activeMainTasks.flatMap(task => getSubtasks(task.id))
  ];

  // For completed view: Include completed main tasks and ALL their subtasks
  const completedTasks = [
    ...completedMainTasks,
    ...completedMainTasks.flatMap(task => getSubtasks(task.id))
  ];

  // Get tasks for calendar view (can include tasks from all goals)
  const getCalendarTasks = () => {
    // Use all tasks if filter is set to 'all', otherwise use only current goal's tasks
    const baseTasks = goalFilter === 'all' ? allTasks : initialTasks;

    // Apply task status filter
    let filtered = baseTasks;
    if (taskFilter === 'active') {
      filtered = filtered.filter(task => !task.completed);
    } else if (taskFilter === 'completed') {
      filtered = filtered.filter(task => task.completed);
    }

    // Only return tasks with planned dates
    return filtered.filter(task => task.plannedDate !== null);
  };

  // Get filtered tasks based on selected filters
  const getFilteredTasks = () => {
    // Start with all available tasks
    let filtered = allTasks;

    // First apply goal filter
    if (goalFilter !== 'all') {
      filtered = filtered.filter(task => task.goalId === Number(goalFilter));
    }

    // Then apply task status filter
    if (taskFilter === 'active') {
      filtered = filtered.filter(task => !task.completed);
    } else if (taskFilter === 'completed') {
      filtered = filtered.filter(task => task.completed);
    }

    // Filter out tasks without planned dates for calendar view
    filtered = filtered.filter(task => task.plannedDate !== null);

    return filtered;
  };

  // Get tasks for selected date
  const tasksForDate = (date: Date) => {
    // Get filtered tasks based on current filters
    const filtered = getCalendarTasks();
    // Then filter by date
    return filtered.filter(task =>
      task.plannedDate &&
      format(new Date(task.plannedDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const handleDateSelect = async (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleUpdateTaskDate = async (taskId: number, date: Date | undefined) => {
    try {
      await updateTask({
        taskId,
        plannedDate: date ? format(date, 'yyyy-MM-dd') : null
      });

      // Update the selected task's date immediately in the UI
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          plannedDate: date ? date : null
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });

      toast({
        title: "Success",
        description: "Task date updated successfully"
      });
    } catch (error) {
      console.error('Failed to update task date:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task date"
      });
    }
  };

  // Update handleToggleComplete to handle subtasks
  const handleToggleComplete = async (task: Task, completed: boolean, subtaskId?: number) => {
    try {
      const taskToUpdate = subtaskId
        ? initialTasks.find(t => t.id === subtaskId)
        : task;

      if (!taskToUpdate) return;

      await updateTask({
        taskId: taskToUpdate.id,
        completed
      });

      // Update the selected task's state immediately in the UI
      if (selectedTask && selectedTask.id === taskToUpdate.id) {
        setSelectedTask({
          ...selectedTask,
          completed
        });
      }

      // If completing a main task, complete all its subtasks
      if (!taskToUpdate.isSubtask && completed) {
        const subtasks = initialTasks.filter(t => t.parentTaskId === taskToUpdate.id);
        await Promise.all(
          subtasks.map(subtask =>
            updateTask({
              taskId: subtask.id,
              completed: true
            })
          )
        );
      }

      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });

      toast({
        title: "Success",
        description: completed ? "Task completed!" : "Task reopened"
      });
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status"
      });
    }
  };

  return (
    <>
      {showOverdueTasks && overdueTasks.length > 0 && (
        <OverdueTasksDialog
          tasks={overdueTasks}
          onClose={() => setShowOverdueTasks(false)}
          onUpdateTaskDate={handleUpdateTaskDate}
        />
      )}

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="vision">Your Why</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <TaskList
            tasks={activeTasks}
            goalId={goalId}
            onUpdateTaskDate={handleUpdateTaskDate}
          />
        </TabsContent>

        <TabsContent value="completed">
          <TaskList
            tasks={completedTasks}
            goalId={goalId}
            readOnly
          />
        </TabsContent>

        <TabsContent value="notes">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">All Notes</h2>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </div>
            <div className="space-y-2">
              {[...initialTasks.filter(task => task.notes), ...standaloneNotes]
                .sort((a, b) => {
                  const dateA = new Date(a.updatedAt || a.createdAt);
                  const dateB = new Date(b.updatedAt || b.createdAt);
                  return dateB.getTime() - dateA.getTime();
                })
                .map(note => (
                  <div
                    key={note.id}
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-md hover:bg-accent/50 cursor-pointer",
                      "transition-colors duration-200"
                    )}
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {'goalId' in note ? (
                        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Quote className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <h3 className="font-medium truncate">{note.title}</h3>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 ml-4">
                      {format(new Date(note.updatedAt || note.createdAt), 'MMM d')}
                    </div>
                  </div>
                ))}
              {initialTasks.filter(task => task.notes).length === 0 && standaloneNotes.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                  <Quote className="h-8 w-8 text-muted-foreground/50 mx-auto mb-4" />
                  <p>No notes found.</p>
                  <p className="text-sm mt-2">Create a new note or add notes to tasks.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <select
                  className="border rounded-md p-2"
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value as 'all' | 'active' | 'completed')}
                >
                  <option value="all">All Tasks</option>
                  <option value="active">Active Tasks</option>
                  <option value="completed">Completed Tasks</option>
                </select>
                <select
                  className="border rounded-md p-2"
                  value={goalFilter}
                  onChange={(e) => setGoalFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">All Goals</option>
                  <option value={goalId}>{goal.title}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 border rounded-md hover:bg-gray-100"
                >
                  🖨️ Print
                </button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary/5 p-4">
                <h2 className="text-xl font-semibold">Task Calendar</h2>
                <div className="flex justify-between items-center mt-2">
                  <button
                    className="p-1 hover:bg-gray-200 rounded"
                    onClick={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setCurrentMonth(newDate);
                    }}
                  >
                    ←
                  </button>
                  <span className="font-medium">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    className="p-1 hover:bg-gray-200 rounded"
                    onClick={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setCurrentMonth(newDate);
                    }}
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center border-b">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                  <div key={day} className="p-2 font-medium border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y">
                {Array.from({ length: 35 }, (_, i) => {
                  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                  const startDay = startOfMonth.getDay(); // 0 = Sunday
                  // Convert Sunday = 0 to Monday = 0 by shifting the days
                  const mondayStartDay = startDay === 0 ? 6 : startDay - 1;
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - mondayStartDay + 1);
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const dayTasks = tasksForDate(date);

                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-[100px] p-2",
                        !isCurrentMonth && "bg-gray-50 text-gray-400",
                        isToday && "bg-primary/5"
                      )}
                    >
                      <div className="font-medium mb-2">
                        {format(date, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayTasks
                          .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
                          .slice(0, 3)
                          .map(task => (
                            <div
                              key={task.id}
                              className={cn(
                                "text-xs p-1 rounded truncate cursor-pointer hover:opacity-80",
                                task.completed ? "bg-orange-100" : "bg-blue-100"
                              )}
                              title={task.title}
                              onClick={() => setSelectedTask(task)}
                            >
                              {task.title}
                            </div>
                          ))}
                        {dayTasks.length > 3 && (
                          <button
                            className="text-xs text-primary hover:text-primary/80 font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Show all tasks for this day
                              setSelectedDate(date);
                              setSelectedTask({
                                ...dayTasks[0],
                                title: `Tasks for ${format(date, 'MMMM d, yyyy')}`,
                                isTaskList: true,
                                dayTasks: dayTasks
                              });
                            }}
                          >
                            + {dayTasks.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vision" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Your Vision Statement</h2>
            {goal.visionStatement ? (
              <div className="bg-primary/5 p-6 rounded-lg space-y-4">
                <div className="flex gap-2">
                  <Quote className="h-5 w-5 text-primary shrink-0 mt-1" />
                  <p className="text-lg italic">{goal.visionStatement}</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-8">
                <p className="text-muted-foreground">
                  You haven't created a vision statement for this goal yet.
                  Let's craft one to keep you motivated!
                </p>
              </div>
            )}
            <VisionGenerator
              goalId={goalId}
              onVisionGenerated={async (vision) => {
                try {
                  if (!vision) {
                    throw new Error("No vision statement received");
                  }

                  const response = await fetch(`/api/goals/${goalId}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      visionStatement: vision
                    })
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || "Failed to save vision statement");
                  }

                  const updatedGoal = await response.json();

                  // Verify the update was successful
                  if (!updatedGoal.visionStatement) {
                    throw new Error("Vision statement was not saved correctly");
                  }

                  toast({
                    title: "Vision Updated",
                    description: "Your vision statement has been saved.",
                  });

                  // Force a refresh of the goals data
                  queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
                } catch (error) {
                  console.error("Failed to update vision:", error);
                  toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to save vision statement",
                    variant: "destructive",
                  });
                }
              }}
            />
          </div>
        </TabsContent>
      </Tabs>


      {selectedTask && (
        <TaskDialog
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdateDate={(date) => {
            if (selectedTask) {
              handleUpdateTaskDate(selectedTask.id, date);
            }
          }}
          onToggleComplete={(completed, subtaskId) => {
            if (selectedTask) {
              handleToggleComplete(selectedTask, completed, subtaskId);
            }
          }}
          initialTasks={initialTasks}
        />
      )}

      {/* Date Picker Dialog */}
      <Dialog
        open={showDatePicker !== null}
        onOpenChange={(open) => !open && setShowDatePicker(null)}
      >
        <DialogContent className="max-w-[min-content]">
          <DialogHeader>
            <DialogTitle>Select Task Date</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={showDatePicker?.date}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            onSelect={(date) => {
              if (showDatePicker && date) {
                handleUpdateTaskDate(showDatePicker.taskId, date);
                setShowDatePicker(null);
              }
            }}
            className="rounded-md border"
            weekStartsOn={1}
          />
        </DialogContent>
      </Dialog>

      {/* Note Editor Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <NoteEditor
            onSave={async (note) => {
              try {
                await fetch('/api/notes', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(note)
                });
                queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
                toast({
                  title: "Success",
                  description: "Note created successfully"
                });
                setShowCreateDialog(false);
              } catch (error) {
                console.error('Failed to create note:', error);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Failed to create note"
                });
              }
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Note Editor Side Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-lg transform transition-transform duration-200 ease-in-out z-50",
        selectedNote ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedNote && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Note</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedNote(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <NoteEditor
                initialTitle={selectedNote.title}
                initialContent={'notes' in selectedNote ? selectedNote.notes : selectedNote.content}
                onSave={async (note) => {
                  try {
                    if ('notes' in selectedNote) {
                      // Update task note
                      await updateTask({
                        taskId: selectedNote.id,
                        notes: note.content
                      });
                    } else {
                      // Update standalone note
                      await fetch(`/api/notes/${selectedNote.id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(note)
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
                    }
                    toast({
                      title: "Success",
                      description: "Note updated successfully"
                    });
                    setSelectedNote(null);
                  } catch (error) {
                    console.error('Failed to update note:', error);
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Failed to update note"
                    });
                  }
                }}
                onCancel={() => setSelectedNote(null)}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}