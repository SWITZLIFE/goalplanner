import { useState } from "react";
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
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Title Section */}
      <div className="space-y-2 p-4 border-b">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          disabled={readOnly}
        />
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 min-h-0 p-4 overflow-auto">
        <textarea
          className="w-full h-full min-h-[300px] bg-transparent resize-none focus:outline-none"
          placeholder="Add your note content here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={readOnly}
        />
      </div>

      {/* Fixed Button Section */}
      {!readOnly && (
        <div className="flex justify-end gap-2 p-4 border-t bg-background">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={async () => {
              if (!title.trim()) {
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
                  content: content
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
            }} 
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}