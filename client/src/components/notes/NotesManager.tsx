import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NoteEditor } from "./NoteEditor";
import { Plus, FileText, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  goalId: number | null;
}

interface NotesManagerProps {
  goalId?: number;
}

export function NotesManager({ goalId }: NotesManagerProps) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all notes
  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ['/api/notes'],
    queryFn: async () => {
      const response = await fetch('/api/notes', {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }
      return response.json();
    },
  });

  // Filter notes strictly based on goalId match
  const visibleNotes = notes.filter(note => {
    // Debug logging to check note filtering
    console.log('Filtering note:', {
      noteId: note.id,
      noteGoalId: note.goalId,
      currentGoalId: goalId,
      shouldShow: !goalId || (note.goalId === null || Number(note.goalId) === Number(goalId))
    });

    if (!goalId) {
      // In main notes view, show all notes
      return true;
    }

    // In a goal view, strictly show only:
    // 1. Notes that have no goalId (null)
    // 2. Notes that have exactly matching goalId (using strict equality with number conversion)
    return note.goalId === null || Number(note.goalId) === Number(goalId);
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (note: { title: string; content: string }) => {
      const payload = {
        title: note.title,
        content: note.content,
        goalId: goalId || null // Explicitly set goalId to null if not provided
      };

      console.log('Creating note with payload:', payload);

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create note: ${error}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: `Note created ${goalId ? "for goal" : "successfully"}`
      });
    },
    onError: (error) => {
      console.error('Note creation error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create note"
      });
    }
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({
      id,
      ...note
    }: { id: number; title: string; content: string }) => {
      const response = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...note, goalId: goalId || null }), // Explicitly set goalId to null if not provided
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setSelectedNote(null);
      toast({
        title: "Success",
        description: "Note updated successfully"
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">
          {goalId ? "Goal Notes" : "All Notes"}
        </h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Notes List */}
      <div className="grid gap-4">
        {visibleNotes.map((note) => (
          <div
            key={note.id}
            className={cn(
              "flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-accent/50",
              "cursor-pointer transition-colors duration-200"
            )}
            onClick={() => setSelectedNote(note)}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">{note.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Last updated: {format(new Date(note.updatedAt), "PP")}
                </p>
              </div>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}

        {visibleNotes.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-4" />
            <p>No notes {goalId ? "for this goal" : ""} yet</p>
            <p className="text-sm mt-2">Click the "New Note" button to create one</p>
          </div>
        )}
      </div>

      {/* Create Note Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <NoteEditor
            onSave={async (note) => {
              await createNoteMutation.mutateAsync(note);
            }}
            goalId={goalId}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Note Side Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-lg transform transition-transform duration-200 ease-in-out z-50",
        selectedNote ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedNote && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedNote(null)}
                  className="rounded-full p-2 hover:bg-accent/50"
                >
                  <X className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-semibold">Edit Note</h2>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <NoteEditor
                initialTitle={selectedNote.title}
                initialContent={selectedNote.content}
                goalId={goalId}
                onSave={async (note) => {
                  await updateNoteMutation.mutateAsync({
                    id: selectedNote.id,
                    ...note,
                  });
                }}
                onCancel={() => setSelectedNote(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}