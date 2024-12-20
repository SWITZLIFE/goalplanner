import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useGoals } from "@/hooks/use-goals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Task } from "@db/schema";
import { StickyNote, Clock, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{task.isSubtask ? "Edit Subtask" : "Edit Task"}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 py-4">
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
            </TabsContent>
            
            <TabsContent value="notes" className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  <Label htmlFor="notes">Task Notes</Label>
                </div>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this task..."
                  className="min-h-[200px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="mr-auto"
            >
              Delete
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
