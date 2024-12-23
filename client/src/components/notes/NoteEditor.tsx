import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface NoteEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (note: { title: string; content: string }) => Promise<void>;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function NoteEditor({ 
  initialTitle = "", 
  initialContent = "", 
  onSave,
  onCancel,
  readOnly = false 
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: initialContent,
    editable: !readOnly,
  });

  const handleSave = async () => {
    if (!editor || !title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a title for your note"
      });
      return;
    }

    try {
      setIsSaving(true);
      await onSave?.({
        title: title.trim(),
        content: editor.getHTML()
      });

      toast({
        title: "Success",
        description: "Note saved successfully"
      });
    } catch (error) {
      console.error('Failed to save note:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save note"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          disabled={readOnly}
        />
      </div>

      <div className="min-h-[200px] border rounded-lg p-4">
        <EditorContent editor={editor} className="prose max-w-none min-h-[200px]" />
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
