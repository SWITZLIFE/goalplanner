import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Laptop, MinimizeIcon, SendHorizontal } from "lucide-react";
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
  const [messages, setMessages] = useState<Array<{ type: 'welcome' | 'user' | 'response', message: string }>>([]);

  const { data: initialMessage, isLoading } = useQuery<{ message: string; type: string }>({
    queryKey: [`/api/goals/${goalId}/coaching`],
  });

  // Set initial welcome message
  useEffect(() => {
    if (initialMessage && !messages.some(m => m.type === 'welcome')) {
      setMessages([{ type: 'welcome', message: initialMessage.message }]);
    }
  }, [initialMessage, messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setInputValue("");
    setMessages(prev => [...prev, { type: 'user', message: userMessage }]);

    try {
      const response = await fetch(`/api/goals/${goalId}/coaching/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      
      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      setMessages(prev => [...prev, { type: 'response', message: data.message }]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
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
          <Skeleton className="h-16 w-full" />
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`${
                msg.type === 'user' 
                  ? 'ml-auto bg-primary text-primary-foreground' 
                  : 'bg-muted'
              } rounded-lg p-3 max-w-[80%]`}
            >
              <p className="text-sm">{msg.message}</p>
            </div>
          ))
        )}
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
