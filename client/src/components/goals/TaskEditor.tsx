import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useGoals } from "@/hooks/use-goals";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { Task } from "@db/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyNote, Clock, Calendar as CalendarIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const NOTE_TEMPLATES = {
  default: "",
  research: `## Research Notes\n\n### Key Questions\n- \n\n### Resources\n- \n\n### Findings\n- \n\n### Next Steps\n- `,
  meeting: `## Meeting Notes\n\n### Attendees\n- \n\n### Discussion Points\n- \n\n### Action Items\n- \n\n### Follow-up\n- `,
  bug: `## Bug Report\n\n### Description\n\n### Steps to Reproduce\n1. \n2. \n3. \n\n### Expected Behavior\n\n### Actual Behavior\n\n### Solution\n`,
  feature: `## Feature Implementation\n\n### Requirements\n- \n\n### Technical Design\n- \n\n### Testing Plan\n- \n\n### Deployment Notes\n- `,
  documentation: `## Documentation\n\n### Overview\n\n### Usage\n\n### Examples\n\n### Notes\n- `,
};

interface TaskEditorProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskEditor({ task, open, onOpenChange }: TaskEditorProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { updateTask, deleteTask } = useGoals();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      if (!title.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Task title cannot be empty"
        });
        return;
      }

      await updateTask({ 
        taskId: task.id, 
        title: title.trim(),
        notes: notes.trim() || null,
      });
      
      toast({
        title: "Success",
        description: "Task updated successfully"
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save task:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save task"
      });
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

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header Section with Title and Metadata */}
            <div className="px-4 py-4 space-y-4 border-b">
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

            {/* Notes Section - Takes remaining height */}
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  <Label htmlFor="notes">Notes</Label>
                </div>
                <Select
                  onValueChange={(value) => {
                    if (notes && notes.trim()) {
                      if (window.confirm("This will replace your current notes. Are you sure?")) {
                        setNotes(NOTE_TEMPLATES[value as keyof typeof NOTE_TEMPLATES]);
                      }
                    } else {
                      setNotes(NOTE_TEMPLATES[value as keyof typeof NOTE_TEMPLATES]);
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="research">Research Template</SelectItem>
                    <SelectItem value="meeting">Meeting Template</SelectItem>
                    <SelectItem value="bug">Bug Report Template</SelectItem>
                    <SelectItem value="feature">Feature Template</SelectItem>
                    <SelectItem value="documentation">Documentation Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this task..."
                className="flex-1 resize-none h-full min-h-[200px] font-mono"
              />
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
                onClick={async () => {
                  setIsSaving(true);
                  await handleSave();
                  setIsSaving(false);
                }}
                className="w-full"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
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
