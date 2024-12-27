import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Bold, Italic, Link, Quote, List, ListOrdered, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Task } from "@db/schema";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Note content is required"),
  taskId: z.string().optional(),
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

const fontSizes = [
  { value: '10px', label: '10px' },
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
];

export function NoteList({ goalId, tasks }: NoteListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle.configure({ types: ['textStyle'] }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[300px] p-4',
        style: 'font-size: 10px',
      },
    },
  });

  // Only show incomplete tasks in the dropdown
  const incompleteTasks = tasks.filter(task => !task.completed);

  // Fetch notes for this goal
  const { data: notes = [], isLoading } = useQuery<Note[]>({
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
        body: JSON.stringify(values),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/notes`] });
      setIsCreating(false);
      form.reset();
      editor?.commands.setContent('');
      toast({
        title: "Note created",
        description: "Your note has been created successfully.",
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

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const content = editor?.getHTML() || '';
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Note content is required",
        variant: "destructive",
      });
      return;
    }
    createNoteMutation.mutate({
      ...values,
      content,
    });
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
                editor?.commands.setContent('');
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
                {editor && (
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <div className="border-b p-2 flex gap-2 flex-wrap">
                      <Select
                        value={editor.getAttributes('textStyle').fontSize || '10px'}
                        onValueChange={(value) => {
                          editor.chain().focus().setStyle({ fontSize: value }).run();
                        }}
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue placeholder="10px" />
                        </SelectTrigger>
                        <SelectContent>
                          {fontSizes.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={cn(editor.isActive('bold') && 'bg-muted')}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={cn(editor.isActive('italic') && 'bg-muted')}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={cn(editor.isActive('bulletList') && 'bg-muted')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={cn(editor.isActive('orderedList') && 'bg-muted')}
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={cn(editor.isActive('blockquote') && 'bg-muted')}
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                      <EditorContent editor={editor} className="min-h-[300px]" />
                    </div>
                  </div>
                )}
              </FormItem>

              {incompleteTasks.length > 0 && (
                <FormField
                  control={form.control}
                  name="taskId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associate with Task (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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

              <Button type="submit" className="w-full">
                {createNoteMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  "Create Note"
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}