import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "./TaskList";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Calendar as CalendarIcon, CheckCircle2, Circle, Quote } from "lucide-react";
import { VisionGenerator } from "./VisionGenerator";

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

export function TaskViews({ tasks, goalId, goal }: TaskViewsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [goalFilter, setGoalFilter] = useState<number | 'all'>('all');
  const { updateTask, createTask, updateGoal, goals } = useGoals();
  const { toast } = useToast();

  // Get all main tasks (non-subtasks)
  const mainTasks = tasks.filter(task => !task.isSubtask);
  
  // Get subtasks for a given parent task
  const getSubtasks = (parentId: number) => tasks.filter(task => task.parentTaskId === parentId);
  
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

  // Filter tasks based on selected filters
  const getFilteredTasks = () => {
    let filtered = tasks;
    
    // First apply goal filter
    if (goalFilter !== 'all') {
      filtered = filtered.filter(task => task.goalId === goalFilter);
    }
    
    // Then apply task status filter
    if (taskFilter === 'active') {
      filtered = filtered.filter(task => !task.completed);
    } else if (taskFilter === 'completed') {
      filtered = filtered.filter(task => task.completed);
    }
    
    return filtered;
  };

  // Get tasks for selected date
  const tasksForDate = (date: Date) => {
    // First get filtered tasks based on current filters
    const filtered = getFilteredTasks();
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
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      await updateTask({ 
        taskId, 
        title: task.title,
        plannedDate: date ? date.toISOString() : null
      });
    } catch (error) {
      console.error('Failed to update task date:', error);
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
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
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
                  const dayTasks = getFilteredTasks().filter(task => 
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
                        {dayTasks.map(task => (
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                onClick={() => handleToggleComplete(selectedTask)}
              >
                {selectedTask.completed ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-green-600">Completed</span>
                  </>
                ) : (
                  <>
                    <Circle className="h-5 w-5 text-blue-500" />
                    <span className="text-blue-600">In Progress</span>
                  </>
                )}
              </div>

              {selectedTask.estimatedMinutes && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Estimated: {selectedTask.estimatedMinutes} minutes</span>
                </div>
              )}

              {selectedTask.plannedDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    Planned for: {format(new Date(selectedTask.plannedDate), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}

              {/* Show subtasks if this is a main task */}
              {!selectedTask.isSubtask && (
                <div className="space-y-2">
                  <h3 className="font-medium">Subtasks</h3>
                  <div className="space-y-2">
                    {tasks
                      .filter(t => t.parentTaskId === selectedTask.id)
                      .map(subtask => (
                        <div 
                          key={subtask.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {subtask.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-blue-500" />
                          )}
                          <span>{subtask.title}</span>
                          {subtask.estimatedMinutes && (
                            <span className="text-muted-foreground">
                              ({subtask.estimatedMinutes} min)
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}