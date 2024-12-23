import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Pencil, Trash2, Link } from "lucide-react";

interface Note {
  id: number;
  title: string;
  content: string;
  goalId: number;
  taskId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface NotesProps {
  goalId: number;
}

export function Notes({ goalId }: NotesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: [`/api/goals/${goalId}/notes`],
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (note: { title: string; content: string }) => {
      const response = await fetch(`/api/goals/${goalId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
      if (!response.ok) throw new Error("Failed to create note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/notes`] });
      setNewNote({ title: "", content: "" });
      toast({
        title: "Success",
        description: "Note created successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create note",
      });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (note: Note) => {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: note.title, content: note.content }),
      });
      if (!response.ok) throw new Error("Failed to update note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/notes`] });
      setEditingNote(null);
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update note",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/notes`] });
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete note",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Title and content are required",
      });
      return;
    }
    createNoteMutation.mutate(newNote);
  };

  if (isLoading) {
    return <div>Loading notes...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add New Note</CardTitle>
          <CardDescription>Create a new note for this goal</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Note title"
                value={newNote.title}
                onChange={(e) =>
                  setNewNote({ ...newNote, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Note content"
                value={newNote.content}
                onChange={(e) =>
                  setNewNote({ ...newNote, content: e.target.value })
                }
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Add Note</Button>
          </CardFooter>
        </form>
      </Card>

      <div className="space-y-4">
        {notes.map((note: Note) => (
          <Card key={note.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{note.title}</CardTitle>
                  <CardDescription>
                    {format(new Date(note.createdAt), "MMM d, yyyy")}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {note.taskId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Linked to task"
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingNote(note)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingNote?.id === note.id ? (
                <div className="space-y-4">
                  <Input
                    value={editingNote.title}
                    onChange={(e) =>
                      setEditingNote({ ...editingNote, title: e.target.value })
                    }
                  />
                  <Textarea
                    value={editingNote.content}
                    onChange={(e) =>
                      setEditingNote({ ...editingNote, content: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => updateNoteMutation.mutate(editingNote)}>
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingNote(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{note.content}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
