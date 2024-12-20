import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useGoals } from "@/hooks/use-goals";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { Task } from "@db/schema";
import { StickyNote, Clock, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskEditorProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskEditor({ task, open, onOpenChange }: TaskEditorProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { updateTask, deleteTask } = useGoals();

  const handleSave = async () => {
    if (title.trim()) {
      await updateTask({ 
        taskId: task.id, 
        title: title.trim(),
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <>
      <div className={cn(
        "fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-lg transform transition-transform duration-200 ease-in-out",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">
              {task.isSubtask ? "Subtask Details" : "Task Details"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-6">
              {/* Details Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title"
                  />
                </div>
                
                {/* Task metadata */}
                <div className="text-sm text-muted-foreground space-y-2">
                  {task.estimatedMinutes && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Estimated: {task.estimatedMinutes} minutes</span>
                    </div>
                  )}
                  
                  {task.plannedDate && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        Planned for: {format(new Date(task.plannedDate), 'MMMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  <Label htmlFor="notes">Notes</Label>
                </div>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this task..."
                  className="min-h-[200px] resize-none"
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-muted/40">
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full"
              >
                Delete
              </Button>
              <Button
                type="submit"
                onClick={handleSave}
                className="w-full"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {task.isSubtask ? "subtask" : "task"}
              {!task.isSubtask && " and all its subtasks"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
