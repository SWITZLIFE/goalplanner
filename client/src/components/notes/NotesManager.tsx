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
}

export function NotesManager() {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (note: { title: string; content: string }) => {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(note),
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setShowCreateDialog(false);
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({
      id,
      ...note
    }: { id: number; title: string; content: string }) => {
      const response = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(note),
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setSelectedNote(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Your Notes</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      <div className="grid gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className={cn(
              "flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-accent/50",
              "cursor-pointer transition-colors duration-200 !bg-white"
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

        {notes.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-4" />
            <p>No notes yet</p>
            <p className="text-sm mt-2">Click the "New Note" button to create one</p>
          </div>
        )}
      </div>

      {/* Note Side Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-lg transform transition-transform duration-200 ease-in-out z-50",
        (showCreateDialog || selectedNote) ? "translate-x-0" : "translate-x-full"
      )}>
        {(showCreateDialog || selectedNote) && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setShowCreateDialog(false);
                    setSelectedNote(null);
                  }}
                  className="rounded-full p-2 hover:bg-accent/50"
                >
                  <X className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-semibold">
                  {showCreateDialog ? "Create New Note" : "Edit Note"}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <NoteEditor
                initialTitle={selectedNote?.title}
                initialContent={selectedNote?.content}
                onSave={async (note) => {
                  if (selectedNote) {
                    await updateNoteMutation.mutateAsync({
                      id: selectedNote.id,
                      ...note,
                    });
                  } else {
                    await createNoteMutation.mutateAsync(note);
                  }
                }}
                onCancel={() => {
                  setShowCreateDialog(false);
                  setSelectedNote(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
