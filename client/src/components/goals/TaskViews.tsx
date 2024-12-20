import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "./TaskList";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Calendar as CalendarIcon, CheckCircle2, XCircle } from "lucide-react";

interface TaskViewsProps {
  tasks: Task[];
  goalId: number;
}

export function TaskViews({ tasks, goalId }: TaskViewsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { updateTask, createTask } = useGoals();
  const { toast } = useToast();

  // Split tasks into active and completed
  const activeTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  // Get tasks for selected date
  const tasksForDate = (date: Date) => {
    return tasks.filter(task => 
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

  return (
    <>
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
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
                <select className="border rounded-md p-2">
                  <option>All Tasks</option>
                  <option>Active Tasks</option>
                  <option>Completed Tasks</option>
                </select>
                <select className="border rounded-md p-2">
                  <option>All Goals</option>
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
                  <button className="p-1 hover:bg-gray-200 rounded">←</button>
                  <span className="font-medium">December 2024</span>
                  <button className="p-1 hover:bg-gray-200 rounded">→</button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 text-center border-b">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="p-2 font-medium border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 divide-x divide-y">
                {Array.from({ length: 35 }, (_, i) => {
                  const date = new Date(2024, 11, i - 4); // December 2024
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const dayTasks = tasksForDate(date);
                  
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "min-h-[100px] p-2",
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
              <div className="flex items-center gap-2">
                {selectedTask.completed ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-green-600">Completed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-blue-500" />
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
                            <XCircle className="h-4 w-4 text-blue-500" />
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
