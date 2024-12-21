import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareQuote, Mail, MailOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DailyMotivation() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/motivation/daily"],
    enabled: isOpen, // Only fetch when user opens the message
  });

  const generateMessageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/motivation/daily/generate", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate message");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/motivation/daily"], data);
      setIsOpen(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate your daily message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleOpenMessage = () => {
    if (!isOpen) {
      generateMessageMutation.mutate();
    }
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <MessageSquareQuote className="h-6 w-6 text-primary/60 mt-1 flex-shrink-0" />
          <div className="space-y-2 min-h-[60px] flex-grow">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-primary/60">
                Message from your future self
              </h3>
              {!isOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary/60 hover:text-primary"
                  onClick={handleOpenMessage}
                  disabled={generateMessageMutation.isPending}
                >
                  <Mail className="h-4 w-4 animate-bounce" />
                  <span className="ml-2">New Message</span>
                </Button>
              )}
            </div>
            {isOpen && (
              <div className="mt-4">
                {isLoading || generateMessageMutation.isPending ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <MailOpen className="h-5 w-5 text-primary/60 mt-1" />
                    <p className="text-lg text-primary">
                      {data?.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
