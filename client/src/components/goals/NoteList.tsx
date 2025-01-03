import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Task } from "@db/schema";
import { Input } from "@/components/ui/input";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { queryClient } from "@/lib/queryClient";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Note content is required"),
  taskId: z.number().optional(),
});

interface Note {
  id: number;
  title: string;
  content: string;
  taskId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface NoteListProps {
  goalId: number;
  tasks: Task[];
  initialTaskId?: number;
  viewTaskId?: number;
  onClose?: () => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b p-2 flex gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        data-active={editor.isActive('bold')}
      >
        Bold
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        data-active={editor.isActive('italic')}
      >
        Italic
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        data-active={editor.isActive('bulletList')}
      >
        Bullet List
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        data-active={editor.isActive('orderedList')}
      >
        Numbered List
      </Button>
    </div>
  );
};

const NoteEditor = ({ onSubmit, initialContent = '' }: { onSubmit: (html: string) => void, initialContent?: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none p-4 h-[400px] overflow-y-auto',
      },
    },
    onUpdate: ({ editor }) => {
      onSubmit(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export function NoteList({ goalId, tasks, initialTaskId, viewTaskId, onClose }: NoteListProps) {
  const [isCreating, setIsCreating] = useState(!!initialTaskId);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const { toast } = useToast();

  // Only show incomplete tasks in the dropdown
  const incompleteTasks = tasks.filter(task => !task.completed);

  // Fetch notes for this goal
  const { data: notes = [], isLoading, refetch } = useQuery<Note[]>({
    queryKey: [`/api/goals/${goalId}/notes`],
  });

  // Filter notes if viewing task-specific notes
  const displayedNotes = viewTaskId ? notes.filter(note => note.taskId === viewTaskId) : notes;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      taskId: initialTaskId || viewTaskId,
    },
  });

  useEffect(() => {
    if (selectedNote) {
      form.reset({
        title: selectedNote.title,
        content: selectedNote.content,
        taskId: selectedNote.taskId || undefined,
      });
    }
  }, [selectedNote, form]);

  const createNoteMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await fetch(`/api/goals/${goalId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          taskId: values.taskId || null,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create note");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Note created",
        description: "Your note has been created successfully.",
      });

      // Fix the invalidateQueries call to use the proper type
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/notes`] });

      // Close the panel immediately after successful creation if in task note creation mode
      if (onClose) {
        onClose();
      } else {
        setIsCreating(false);
        form.reset();
        refetch();
      }
    },
    onError: (error: Error) => {
      console.error("Failed to create note:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema> & { noteId: number }) => {
      const { noteId, ...noteData } = values;
      const response = await fetch(`/api/goals/${goalId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...noteData,
          taskId: noteData.taskId || null,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update note");
      }

      return response.json();
    },
    onSuccess: () => {
      setSelectedNote(null);
      form.reset();
      refetch();
      toast({
        title: "Note updated",
        description: "Your note has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update note:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`/api/goals/${goalId}/notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete note");
      }

      return response.json();
    },
    onSuccess: () => {
      refetch();
      if (selectedNote) setSelectedNote(null);
      toast({
        title: "Note deleted",
        description: "Your note has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to delete note:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (selectedNote) {
        await updateNoteMutation.mutateAsync({ ...values, noteId: selectedNote.id });
      } else {
        await createNoteMutation.mutateAsync(values);
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleNoteClick = (note: Note) => {
    setIsCreating(false);
    setSelectedNote(note);
  };

  const closeSidePanel = () => {
    setIsCreating(false);
    setSelectedNote(null);
    form.reset();
    if(onClose) onClose();
  };

  if (isLoading) {
    return <div>Loading notes...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">
          {viewTaskId 
            ? `Notes for "${tasks.find(t => t.id === viewTaskId)?.title}"`
            : onClose ? "Create Note" : "Notes"
          }
        </h3>
        {onClose ? (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        ) : !viewTaskId && (
          <Button onClick={() => {
            setSelectedNote(null);
            setIsCreating(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Note
          </Button>
        )}
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {displayedNotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No notes yet. {!viewTaskId && "Create one to get started!"}
            </p>
          ) : (
            displayedNotes.map((note) => (
              <div
                key={note.id}
                className={`group p-4 transition-colors cursor-pointer rounded-lg border ${
                  selectedNote?.id === note.id ? 'bg-[#D8F275] border-[#D8F275]' : 'bg-white hover:bg-[#D8F275] border-border hover:border-[#D8F275]'
                }`}
                onClick={() => handleNoteClick(note)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{note.title}</h3>
                    {note.taskId && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Associated Task:{" "}
                        {tasks.find(t => t.id === note.taskId)?.title}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), "MMM d, yyyy")}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNoteMutation.mutate(note.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel for Note Creation/Editing */}
      {(isCreating || selectedNote) && (
        <div className="fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-xl">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {selectedNote ? "Edit Note" : "Create New Note"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeSidePanel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Note title..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <NoteEditor
                            onSubmit={field.onChange}
                            initialContent={selectedNote?.content}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {incompleteTasks.length > 0 && (
                    <FormField
                      control={form.control}
                      name="taskId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Associate with Task (Optional)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a task" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {incompleteTasks.map((task) => (
                                <SelectItem key={task.id} value={task.id.toString()}>
                                  {task.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                  >
                    {(createNoteMutation.isPending || updateNoteMutation.isPending) ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      selectedNote ? "Update Note" : "Create Note"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}