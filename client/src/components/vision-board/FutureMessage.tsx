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

interface FutureMessageResponse {
  message: string | null;
  isRead: boolean;
}

export function FutureMessage() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: message, isLoading, error } = useQuery<FutureMessageResponse>({
    queryKey: ["/api/future-message/today"],
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 401) return false;
      return failureCount < 3;
    },
  });

  const generateMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/future-message/generate", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You must be logged in to generate a message");
        }
        throw new Error("Failed to generate message");
      }

      return response.json() as Promise<FutureMessageResponse>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/future-message/today"], data);
      setIsOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate your message",
        variant: "destructive",
      });
    },
  });

  const readMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/future-message/read", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You must be logged in to read messages");
        }
        throw new Error("Failed to mark message as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/future-message/today"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open message",
        variant: "destructive",
      });
    },
  });

  // Don't show anything if there's an auth error
  if (error) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mb-8 bg-white rounded-lg p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Message from Your Future Self</h2>
        </div>
        <div className="mt-4 text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-white rounded-lg p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Message from Your Future Self</h2>
        {(!message?.message || message.message === null) && !message?.isRead && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => generateMessageMutation.mutate()}
            disabled={generateMessageMutation.isPending}
          >
            <Mail className="w-4 h-4" />
            {generateMessageMutation.isPending ? "Generating..." : "Read Today's Message"}
          </Button>
        )}
      </div>

      {message?.message ? (
        message.isRead ? (
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
              <Button 
                onClick={() => {
                  readMessageMutation.mutate();
                  setIsOpen(false);
                }}
              >
                I've Read This
              </Button>
            </DialogContent>
          </Dialog>
        )
      ) : (
        <div className="mt-4 text-muted-foreground">
          Your daily message is waiting for you. Click the button above to receive it.
        </div>
      )}
    </div>
  );
}