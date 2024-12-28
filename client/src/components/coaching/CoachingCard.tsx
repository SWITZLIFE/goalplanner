import { useState, useEffect, useRef } from "react";
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
  // Initialize all state hooks at the top
  const [isMinimized, setIsMinimized] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Array<{ type: 'welcome' | 'user' | 'response' | 'typing', message: string; id?: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create refs for auto-scrolling and input focus
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Query hook
  const { data: initialMessage, isLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}/coaching`],
    retry: false,
  });

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // Maintain focus on input after scrolling
    inputRef.current?.focus();
  };

  // Effect for initial welcome message
  useEffect(() => {
    if (initialMessage && !messages.some(m => m.type === 'welcome')) {
      setMessages([{ 
        type: 'welcome', 
        message: initialMessage.message,
        id: 'welcome-' + Date.now() 
      }]);
    }
  }, [initialMessage, messages]);

  // Effect for cleanup
  useEffect(() => {
    return () => {
      setIsTyping(false);
      setMessages(prev => prev.filter(m => m.type !== 'typing'));
    };
  }, []);

  // Effect for auto-scrolling
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue;
    const messageId = Date.now().toString();
    setInputValue("");
    setError(null);
    
    setMessages(prev => [
      ...prev, 
      { type: 'user', message: userMessage, id: `user-${messageId}` }
    ]);

    try {
      setIsTyping(true);
      setMessages(prev => [
        ...prev, 
        { type: 'typing', message: '...', id: `typing-${messageId}` }
      ]);
      
      const response = await fetch(`/api/goals/${goalId}/coaching/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      
      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      setMessages(prev => {
        const withoutTyping = prev.filter(m => m.type !== 'typing');
        return [
          ...withoutTyping,
          ...(data.messages || [data.message]).map((msg: any) => {
            let messageText = '';
            try {
              // Handle object format
              if (typeof msg === 'object' && msg !== null) {
                messageText = msg.text || msg.message || String(msg);
              }
              // Handle string format
              else if (typeof msg === 'string') {
                if (msg.trim().startsWith('{') || msg.trim().startsWith('[')) {
                  try {
                    const parsed = JSON.parse(msg);
                    messageText = parsed.text || parsed.message || msg;
                  } catch {
                    messageText = msg;
                  }
                } else {
                  messageText = msg;
                }
              }
              // Handle other types
              else {
                messageText = String(msg || '');
              }

              // Clean up the message
              messageText = messageText.trim();
              if (!messageText) {
                messageText = 'Invalid message format received';
              }
            } catch (error) {
              console.error('Error processing message:', error);
              messageText = 'Error processing message';
            }
            
            return {
              type: 'response' as const,
              message: messageText,
              id: `response-${Date.now()}-${Math.random()}`
            };
          })
        ].slice(-50); // Keep only the last 50 messages
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setError("Failed to send message. Please try again.");
      setMessages(prev => prev.filter(m => m.type !== 'typing'));
    } finally {
      setIsTyping(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 p-6">
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
    <Card className="fixed bottom-8 right-8 w-96 h-[500px] shadow-xl z-50 flex flex-col m-6">
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
        ) : error ? (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3">
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id || `${msg.type}-${msg.message}`}
              className={`${
                msg.type === 'user' 
                  ? 'ml-auto bg-primary text-primary-foreground' 
                  : msg.type === 'typing'
                  ? 'bg-muted animate-pulse'
                  : 'bg-muted'
              } rounded-lg p-3 max-w-[80%] ${
                msg.type === 'typing' ? 'flex gap-2 items-center' : ''
              }`}
            >
              {msg.type === 'typing' ? (
                <>
                  <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                </>
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {typeof msg.message === 'string' 
                    ? msg.message 
                    : 'Invalid message format received'}
                </p>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask your AI coach anything..."
            className="flex-1"
            disabled={isTyping}
            autoFocus
          />
          <Button type="submit" size="icon" disabled={isTyping || !inputValue.trim()}>
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}