import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "./TaskList";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { Task } from "@db/schema";
import { useGoals } from "@/hooks/use-goals";

interface TaskViewsProps {
  tasks: Task[];
  goalId: number;
}

export function TaskViews({ tasks, goalId }: TaskViewsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { updateTask } = useGoals();

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
    await updateTask({ 
      taskId, 
      plannedDate: date ? date.toISOString() : null 
    });
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
        <div className="grid md:grid-cols-[1fr,300px] gap-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
          />
          
          {selectedDate && (
            <div className="space-y-4">
              <h3 className="font-medium">
                Tasks for {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <TaskList
                tasks={tasksForDate(selectedDate)}
                goalId={goalId}
                onUpdateTaskDate={handleUpdateTaskDate}
              />
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
