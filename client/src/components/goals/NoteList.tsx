import { useState } from "react";
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
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Input } from "@/components/ui/input";

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
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean']
  ],
  clipboard: {
    matchVisual: false
  }
};

const formats = [
  'header',
  'size',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'blockquote', 'code-block',
  'link'
];

export function NoteList({ goalId, tasks }: NoteListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const { toast } = useToast();

  // Only show incomplete tasks in the dropdown
  const incompleteTasks = tasks.filter(task => !task.completed);

  // Fetch notes for this goal
  const { data: notes = [], isLoading, refetch } = useQuery<Note[]>({
    queryKey: [`/api/goals/${goalId}/notes`],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      taskId: undefined,
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await fetch(`/api/goals/${goalId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          content: editorContent,
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
      setIsCreating(false);
      form.reset();
      setEditorContent('');
      refetch(); // Refresh the notes list
      toast({
        title: "Note created",
        description: "Your note has been created successfully.",
      });
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!editorContent.trim()) {
        toast({
          title: "Error",
          description: "Note content is required",
          variant: "destructive",
        });
        return;
      }

      await createNoteMutation.mutateAsync({
        ...values,
        content: editorContent,
      });
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  if (isLoading) {
    return <div>Loading notes...</div>;
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Notes</h3>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Note
          </Button>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No notes yet. Create one to get started!
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-sm line-clamp-2">{note.title}</h3>
                    <div 
                      className="prose prose-sm mt-2"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground ml-4">
                    {format(new Date(note.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
                {note.taskId && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Associated Task:{" "}
                    {tasks.find(t => t.id === note.taskId)?.title}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel for Note Creation */}
      {isCreating && (
        <div className="fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-xl p-6 space-y-4 overflow-y-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Create New Note</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsCreating(false);
                form.reset();
                setEditorContent('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

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

              <FormItem>
                <FormLabel>Content</FormLabel>
                <div className="border rounded-lg overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={editorContent}
                    onChange={setEditorContent}
                    modules={modules}
                    formats={formats}
                    className="bg-white"
                    style={{ height: '50vh' }}
                    preserveWhitespace={true}
                  />
                </div>
              </FormItem>

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
                disabled={createNoteMutation.isPending}
              >
                {createNoteMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  "Create Note"
                )}
              </Button>
            </form>
          </Form>

          <style jsx global>{`
            .ql-container {
              height: calc(50vh - 42px) !important;
              font-size: 14px;
              font-family: inherit;
            }
            .ql-editor {
              height: 100%;
              overflow-y: auto;
              padding: 1rem;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}