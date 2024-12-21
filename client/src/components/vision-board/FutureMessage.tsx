import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Mail, MailOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function FutureMessage() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: message, isLoading } = useQuery({
    queryKey: ["/api/future-message/today"],
  });

  const readMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/future-message/read", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to mark message as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/future-message/today"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to open message",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="h-20 flex items-center justify-center">Loading...</div>;
  }

  if (!message) {
    return null;
  }

  return (
    <div className="mb-8 bg-primary/5 rounded-lg p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Message from Your Future Self</h2>
        {!message.isRead && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              readMessageMutation.mutate();
              setIsOpen(true);
            }}
          >
            <Mail className="w-4 h-4" />
            New Message
          </Button>
        )}
      </div>

      {message.isRead ? (
        <div className="mt-4">
          <div className="flex gap-2 items-start">
            <MailOpen className="w-5 h-5 text-primary shrink-0 mt-1" />
            <p className="text-lg">{message.message}</p>
          </div>
        </div>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>A Message From Your Future Self</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-lg">{message.message}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
