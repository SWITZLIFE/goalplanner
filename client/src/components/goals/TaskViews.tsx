import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "./TaskList";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TaskViewsProps {
  tasks: Task[];
  goalId: number;
}

const generateICalString = (tasks: Task[]): string => {
  const now = new Date();
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Task Management App//Microsoft Corporation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Task Management Calendar',
    'X-WR-TIMEZONE:UTC',
    'X-MS-OLK-FORCEINSPECTOROPEN:TRUE'
  ].join('\r\n');

  const events = tasks
    .filter(task => task.plannedDate)
    .map(task => {
      const date = new Date(task.plannedDate!);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      return [
        'BEGIN:VEVENT',
        `DTSTART;VALUE=DATE:${format(date, "yyyyMMdd")}`,
        `DTEND;VALUE=DATE:${format(nextDay, "yyyyMMdd")}`,
        `DTSTAMP:${format(now, "yyyyMMdd'T'HHmmss'Z'")}`,
        `UID:${task.id}-${Date.now()}@taskmanagement.app`,
        `CREATED:${format(new Date(task.createdAt), "yyyyMMdd'T'HHmmss'Z'")}`,
        `LAST-MODIFIED:${format(now, "yyyyMMdd'T'HHmmss'Z'")}`,
        'CLASS:PUBLIC',
        `STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`,
        `CATEGORIES:${task.completed ? 'Completed Tasks' : 'Active Tasks'}`,
        'TRANSP:TRANSPARENT',
        `SUMMARY:${task.title}`,
        `DESCRIPTION:Status: ${task.completed ? 'Completed' : 'Active'}\\n\\nTask from Task Management App`,
        'END:VEVENT'
      ].join('\r\n');
    })
    .join('\r\n');

  return `${header}\r\n${events}\r\nEND:VCALENDAR`;
};



export function TaskViews({ tasks, goalId }: TaskViewsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
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

  const exportCalendar = () => {
    try {
      const icalString = generateICalString(tasks);
      const blob = new Blob([icalString], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'tasks.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Calendar Exported",
        description: "Your tasks have been exported to a calendar file.",
      });
    } catch (error) {
      console.error('Failed to export calendar:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export calendar. Please try again.",
      });
    }
  };

  

  return (
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
                {/* We can populate this from goals data later */}
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="p-2 border rounded-md hover:bg-gray-100"
              >
                🖨️ Print
              </button>
              <button
                onClick={exportCalendar}
                className="p-2 border rounded-md hover:bg-gray-100"
                title="Export to Outlook Calendar"
              >
                📅 Export to Calendar
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
                            "text-xs p-1 rounded truncate",
                            task.completed ? "bg-orange-100" : "bg-blue-100"
                          )}
                          title={task.title}
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
  );
}
