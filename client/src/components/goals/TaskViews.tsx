import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "./TaskList";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Task as BaseTask } from "@db/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Quote, X } from "lucide-react";
import { VisionGenerator } from "./VisionGenerator";
import { OverdueTasksDialog } from "./OverdueTasksDialog";
import { useQuery } from "@tanstack/react-query";
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

interface Task extends BaseTask {
  isTaskList?: boolean;
  dayTasks?: Task[];
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
}

interface TaskViewsProps {
  tasks: Task[];
  goalId: number;
  goal: Goal;
}

export function TaskViews({ tasks: initialTasks, goalId, goal }: TaskViewsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [goalFilter, setGoalFilter] = useState<number | 'all'>('all');
  const [showDatePicker, setShowDatePicker] = useState<{ taskId: number; date?: Date } | null>(null);
  const [showOverdueTasks, setShowOverdueTasks] = useState(true);
  const { updateTask, createTask, updateGoal, goals } = useGoals();
  const { toast } = useToast();

  const overdueTasks = initialTasks.filter(task => {
    if (!task.plannedDate || task.completed) return false;
    const taskDate = new Date(task.plannedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate < today;
  });

  const allTasks = goals.reduce<Task[]>((acc, g) => {
    if (g.tasks) {
      return [...acc, ...g.tasks as Task[]];
    }
    return acc;
  }, []);

  const mainTasks = initialTasks.filter(task => !task.isSubtask);
  const getSubtasks = (parentId: number) => initialTasks.filter(task => task.parentTaskId === parentId);

  const activeMainTasks = mainTasks.filter(task => !task.completed);
  const completedMainTasks = mainTasks.filter(task => task.completed);

  const activeTasks = [
    ...activeMainTasks,
    ...activeMainTasks.flatMap(task => getSubtasks(task.id))
  ];

  const completedTasks = [
    ...completedMainTasks,
    ...completedMainTasks.flatMap(task => getSubtasks(task.id))
  ];

  const getCalendarTasks = () => {
    const baseTasks = goalFilter === 'all' ? allTasks : initialTasks;
    let filtered = baseTasks;
    if (taskFilter === 'active') {
      filtered = filtered.filter(task => !task.completed);
    } else if (taskFilter === 'completed') {
      filtered = filtered.filter(task => task.completed);
    }
    return filtered.filter(task => task.plannedDate !== null);
  };

  const tasksForDate = (date: Date) => {
    const filtered = getCalendarTasks();
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

      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          plannedDate: date ? date : null //Corrected line
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

  const handleToggleComplete = async (task: Task) => {
    try {
      await updateTask({
        taskId: task.id,
        completed: !task.completed
      });
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask({
          ...selectedTask,
          completed: !task.completed
        });
      }
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status"
      });
    }
  };

  const handleTaskToggle = async (taskId: number, completed: boolean) => {
    try {
      await updateTask({ taskId, completed });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ 
        title: "Success", 
        description: `Task ${completed ? 'completed' : 'reopened'}`
      });
    } catch (error) {
      console.error("Failed to toggle task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status",
      });
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDialog(true);
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
                  const startDay = startOfMonth.getDay();
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
                              onClick={() => handleTaskClick(task)}
                            >
                              {task.title}
                            </div>
                          ))}
                        {dayTasks.length > 3 && (
                          <button
                            className="text-xs text-primary hover:text-primary/80 font-medium"
                            onClick={() => {
                              setSelectedTask({
                                ...dayTasks[0],
                                title: `Tasks for ${format(date, 'MMMM d, yyyy')}`,
                                isTaskList: true,
                                dayTasks: dayTasks
                              });
                              setShowTaskDialog(true);
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

        <TabsContent value="vision">
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

                  if (!updatedGoal.visionStatement) {
                    throw new Error("Vision statement was not saved correctly");
                  }

                  toast({
                    title: "Vision Updated",
                    description: "Your vision statement has been saved.",
                  });

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
      {selectedTask && (
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {selectedTask?.title}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTaskDialog(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {selectedTask?.plannedDate
                      ? format(new Date(selectedTask.plannedDate), 'MMMM d, yyyy')
                      : 'No date set'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedTask && setShowDatePicker({
                    taskId: selectedTask.id,
                    date: selectedTask.plannedDate ? new Date(selectedTask.plannedDate) : undefined
                  })}
                >
                  Change Date
                </Button>
              </div>

              {/* Show subtasks for regular tasks */}
              {selectedTask && !selectedTask.isTaskList && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Subtasks</h3>
                  <div className="space-y-2">
                    {getSubtasks(selectedTask.id).map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`subtask-${subtask.id}`}
                          checked={subtask.completed}
                          onCheckedChange={(checked) => handleTaskToggle(subtask.id, checked as boolean)}
                        />
                        <label
                          htmlFor={`subtask-${subtask.id}`}
                          className={cn(
                            "text-sm",
                            subtask.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {subtask.title}
                        </label>
                      </div>
                    ))}
                    {getSubtasks(selectedTask.id).length === 0 && (
                      <p className="text-sm text-muted-foreground">No subtasks</p>
                    )}
                  </div>
                </div>
              )}

              {/* Show task list for multiple tasks on same date */}
              {selectedTask?.isTaskList && selectedTask.dayTasks && (
                <div className="space-y-2">
                  {selectedTask.dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
                      />
                      <label
                        htmlFor={`task-${task.id}`}
                        className={cn(
                          "text-sm",
                          task.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Date Picker Dialog */}
      <Dialog
        open={showDatePicker !== null}
        onOpenChange={(open) => !open && setShowDatePicker(null)}
      >
        <DialogContent className="sm:max-w-[350px]">
          <Calendar
            mode="single"
            selected={showDatePicker?.date}
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
    </>
  );
}