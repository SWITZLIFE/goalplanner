import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PenLine, Clock, Link2 } from "lucide-react";
import { format } from "date-fns";
import type { Note } from "@db/schema";

interface NotesTabProps {
  goalId: number;
}

export function NotesTab({ goalId }: NotesTabProps) {
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();
  
  // Fetch notes
  const { data: notes = [], refetch } = useQuery<Note[]>({
    queryKey: [`/api/goals/${goalId}/notes`],
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/goals/${goalId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      return response.json();
    },
    onSuccess: () => {
      setNewNote("");
      refetch();
      toast({
        title: "Note created",
        description: "Your note has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    createNoteMutation.mutate(newNote);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder="Write a new note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[100px]"
        />
        <Button 
          type="submit" 
          disabled={!newNote.trim() || createNoteMutation.isPending}
        >
          <PenLine className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </form>

      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="space-y-2 p-4 rounded-lg bg-muted/50">
              <div className="flex items-start justify-between">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}</span>
                </div>
                {note.taskId && (
                  <div className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    <span>Linked to task</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No notes yet. Start by adding your first note above.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
