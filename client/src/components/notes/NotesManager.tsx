import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NoteEditor } from "./NoteEditor";
import { Plus, FileText, Calendar } from "lucide-react";
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
              "flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50",
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

        {notes.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-4" />
            <p>No notes yet</p>
            <p className="text-sm mt-2">Click the "New Note" button to create one</p>
          </div>
        )}
      </div>

      {/* Create Note Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <NoteEditor
            onSave={async (note) => {
              await createNoteMutation.mutateAsync(note);
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={selectedNote !== null} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <NoteEditor
              initialTitle={selectedNote.title}
              initialContent={selectedNote.content}
              onSave={async (note) => {
                await updateNoteMutation.mutateAsync({
                  id: selectedNote.id,
                  ...note,
                });
              }}
              onCancel={() => setSelectedNote(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
