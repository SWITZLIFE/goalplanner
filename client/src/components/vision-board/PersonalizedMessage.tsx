import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PersonalizedMessageResponse {
  message: string | null;
  messageType: "motivation" | "reflection" | "visualization" | null;
  isRead: boolean;
}

export function PersonalizedMessage() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: message, isLoading } = useQuery<PersonalizedMessageResponse>({
    queryKey: ["/api/personalized-message/today"],
  });

  const generateMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/personalized-message/generate", {
        method: "POST",
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.message || "Failed to generate message");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/personalized-message/today"], {
        message: data.message,
        messageType: data.messageType,
        isRead: false
      });
      setIsOpen(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate your message",
        variant: "destructive",
      });
    },
  });

  const readMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/personalized-message/read", {
        method: "POST",
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.message || "Failed to mark message as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personalized-message/today"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark message as read",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="mb-8 bg-white rounded-lg p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">A Message from Your Future Self</h2>
        </div>
        <div className="mt-4 text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  const getMessageTypeStyles = (type: string | null) => {
    switch (type) {
      case "motivation":
        return "bg-blue-50 border-blue-200";
      case "reflection":
        return "bg-purple-50 border-purple-200";
      case "visualization":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className={cn(
      "mb-8 rounded-lg p-6 border-2",
      message?.message ? getMessageTypeStyles(message.messageType) : "bg-white"
    )}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">A Message from Your Future Self</h2>
        {!message?.message && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => generateMessageMutation.mutate()}
            disabled={generateMessageMutation.isPending}
          >
            <MessageSquare className="w-4 h-4" />
            {generateMessageMutation.isPending ? "Receiving..." : "Receive Today's Message"}
          </Button>
        )}
      </div>

      {message?.message ? (
        message.isRead ? (
          <div className="mt-4">
            <div className="flex gap-2 items-start">
              <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-1" />
              <div>
                <p className="text-lg leading-relaxed">{message.message}</p>
                <p className="text-sm text-muted-foreground mt-2 capitalize">
                  {message.messageType} Message
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className={cn(
              "sm:max-w-md",
              getMessageTypeStyles(message.messageType)
            )}>
              <DialogHeader>
                <DialogTitle>A Message From Your Future Self</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-lg leading-relaxed">{message.message}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {message.messageType} Message
                </p>
              </div>
              <Button 
                onClick={() => {
                  readMessageMutation.mutate();
                  setIsOpen(false);
                }}
              >
                I've Received This Message
              </Button>
            </DialogContent>
          </Dialog>
        )
      ) : (
        <div className="mt-4 text-muted-foreground">
          Your future self has a message waiting for you. Click to receive it.
        </div>
      )}
    </div>
  );
}
