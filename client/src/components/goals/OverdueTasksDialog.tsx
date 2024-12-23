import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Task } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock } from "lucide-react";

interface OverdueTasksDialogProps {
  tasks: Task[];
  onClose: () => void;
  onUpdateTaskDate: (taskId: number, date: Date) => Promise<void>;
}

export function OverdueTasksDialog({ tasks, onClose, onUpdateTaskDate }: OverdueTasksDialogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleMoveAllToToday = async () => {
    try {
      const today = new Date();
      await Promise.all(
        tasks.map(task => onUpdateTaskDate(task.id, today))
      );
      toast({
        title: "Tasks Updated",
        description: "All overdue tasks have been moved to today"
      });
      onClose();
    } catch (error) {
      console.error("Failed to update tasks:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task dates"
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Overdue Tasks Found</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-muted-foreground mb-4">
            You have {tasks.length} overdue {tasks.length === 1 ? 'task' : 'tasks'}. 
            Would you like to move them all to today or reschedule them individually?
          </p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={handleMoveAllToToday} className="flex-1">
                Move All to Today
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Or reschedule individually:</h3>
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 cursor-pointer"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="space-y-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Due: {format(new Date(task.plannedDate!), 'MMM d, yyyy')}</span>
                      {task.estimatedMinutes && (
                        <>
                          <Clock className="h-4 w-4 ml-2" />
                          <span>Est: {task.estimatedMinutes}m</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedTaskId && (
          <Dialog open={true} onOpenChange={() => setSelectedTaskId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select New Date</DialogTitle>
              </DialogHeader>
              <Calendar
                mode="single"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                onSelect={async (date) => {
                  if (date) {
                    await onUpdateTaskDate(selectedTaskId, date);
                    setSelectedTaskId(null);
                    toast({
                      title: "Task Updated",
                      description: "Task has been rescheduled"
                    });
                  }
                }}
                className="rounded-md border"
                weekStartsOn={1}
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}