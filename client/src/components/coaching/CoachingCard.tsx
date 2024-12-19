import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Laptop, MinimizeIcon, MaximizeIcon, SendHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface CoachingCardProps {
  goalId: number;
}

export function CoachingCard({ goalId }: CoachingCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const { data: coaching, isLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}/coaching`],
    refetchInterval: 60000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement chat submission
    setInputValue("");
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          className="rounded-full w-12 h-12 shadow-lg"
          onClick={() => setIsMinimized(false)}
        >
          <Laptop className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Laptop className="h-5 w-5" />
          <h2 className="font-semibold">AI Coach</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setIsMinimized(true)}
        >
          <MinimizeIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : coaching ? (
          <>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm">{coaching.motivation}</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm">{coaching.advice}</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm">{coaching.tip}</p>
            </div>
          </>
        ) : null}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask your AI coach anything..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
