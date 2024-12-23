import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "./TaskList";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Task as BaseTask } from "@db/schema";
import { Button } from "@/components/ui/button";

// Extend the Task type to include properties needed for the task list dialog
interface Task extends BaseTask {
  isTaskList?: boolean;
  dayTasks?: Task[];
}
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Calendar as CalendarIcon, CheckCircle2, Circle, Quote } from "lucide-react";
import { VisionGenerator } from "./VisionGenerator";
import { OverdueTasksDialog } from "./OverdueTasksDialog";

interface Goal {
  id: number;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  totalTasks: number;
  visionStatement: string | null;
  visionResponses: string | null;
}

interface TaskViewsProps {
  tasks: Task[];
  goalId: number;
  goal: Goal;
}

export function TaskViews({ tasks: initialTasks, goalId, goal }: TaskViewsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [goalFilter, setGoalFilter] = useState<number | 'all'>('all');
  const [showDatePicker, setShowDatePicker] = useState<{ taskId: number; date?: Date } | null>(null);
  const [showOverdueTasks, setShowOverdueTasks] = useState(true);
  const { updateTask, createTask, updateGoal, goals } = useGoals();
  const { toast } = useToast();

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
      return [...acc, ...g.tasks];
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
      const task = initialTasks.find(t => t.id === taskId);
      if (!task) return;
      
      await updateTask({ 
        taskId, 
        title: task.title,
        plannedDate: date ? format(date, 'yyyy-MM-dd') : null
      });

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

  const handleToggleComplete = async (task: Task) => {
    try {
      await updateTask({ 
        taskId: task.id, 
        completed: !task.completed 
      });
      // Update the selected task state immediately
      setSelectedTask({
        ...task,
        completed: !task.completed
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
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
                  const dayTasks = getCalendarTasks().filter(task => 
                    task.plannedDate && 
                    format(new Date(task.plannedDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                  );
                  
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
                        {[...dayTasks]
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

      {/* Task Details Dialog */}
      <Dialog 
        open={selectedTask !== null} 
        onOpenChange={(open) => !open && setSelectedTask(null)}
      >
        <DialogContent className="max-w-xl">
            {selectedTask && (
              <div className="space-y-4">
                {selectedTask.isTaskList ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">
                        {selectedTask.title}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {[...selectedTask.dayTasks]
                        .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
                        .map(task => (
                        <div 
                          key={task.id}
                          className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 cursor-pointer"
                        >
                          <div 
                            className="flex items-center gap-2 flex-1"
                            onClick={() => handleToggleComplete(task)}
                          >
                            {task.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 hover:text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-blue-500 hover:text-blue-600" />
                            )}
                            <span className={cn(
                              task.completed && "line-through text-muted-foreground"
                            )}>{task.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            {task.estimatedMinutes && (
                              <>
                                <Clock className="h-4 w-4" />
                                <span>{task.estimatedMinutes}m</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>
                        <div className="flex items-center gap-3">
                          <div 
                            className="cursor-pointer"
                            onClick={() => handleToggleComplete(selectedTask)}
                          >
                            {selectedTask.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 hover:text-green-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-blue-500 hover:text-blue-600" />
                            )}
                          </div>
                          <span className={cn(
                            "text-xl font-semibold",
                            selectedTask.completed && "line-through text-muted-foreground"
                          )}>
                            {selectedTask.title}
                          </span>
                        </div>
                      </DialogTitle>
                    </DialogHeader>

                    {/* Goal context */}
                    <div className="text-sm text-muted-foreground">
                      From goal: {goals.find(g => g.id === selectedTask.goalId)?.title}
                    </div>

                    {/* Subtasks */}
                    <div className="space-y-2">
                      {initialTasks
                        .filter(task => task.parentTaskId === selectedTask.id)
                        .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
                        .map(subtask => (
                          <div 
                            key={subtask.id}
                            className="flex items-center gap-2 p-2 border rounded-lg hover:bg-accent/50 cursor-pointer"
                            onClick={() => handleToggleComplete(subtask)}
                          >
                            {subtask.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 hover:text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-blue-500 hover:text-blue-600" />
                            )}
                            <span className={cn(
                              subtask.completed && "line-through text-muted-foreground"
                            )}>
                              {subtask.title}
                            </span>
                            {subtask.estimatedMinutes && (
                              <div className="flex items-center gap-1 text-muted-foreground text-sm ml-auto">
                                <Clock className="h-3 w-3" />
                                <span>{subtask.estimatedMinutes}m</span>
                              </div>
                            )}
                          </div>
                      ))}
                    </div>

                    {/* Task metadata */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <CalendarIcon className="h-4 w-4" />
                        <span>
                          {selectedTask.plannedDate 
                            ? `Due: ${format(new Date(selectedTask.plannedDate), 'MMMM d, yyyy')}`
                            : "No due date set"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDatePicker({ 
                          taskId: selectedTask.id, 
                          date: selectedTask.plannedDate ? new Date(selectedTask.plannedDate) : undefined 
                        })}
                      >
                        Change Date
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
      </Dialog>
    </>
  );
}