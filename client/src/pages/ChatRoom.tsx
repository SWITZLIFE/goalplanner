import { useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, Smile } from "lucide-react";
import { Link } from "wouter";
import EmojiPicker from "emoji-picker-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  message: string;
  timestamp: string;
  reactions?: Record<string, { emoji: string; users: number[] }>;
}

export default function ChatRoom() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}/api/ws/chat`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        
        if (data.type === 'initial') {
          setMessages(data.messages || []);
        } else if (data.type === 'error') {
          console.error('Chat error:', data.message);
        } else if (data.type === 'reaction_update') {
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, reactions: data.reactions }
              : msg
          ));
        } else {
          setMessages((prev) => [...prev, data]);
        }
        
        // Scroll to bottom after messages update
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    socket.onopen = () => {
      console.log("Connected to chat");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      userId: user?.id,
      username: user?.username || user?.email,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    }));

    setNewMessage("");
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Chat Room</h1>
      </div>

      <Card className="flex flex-col h-[600px]">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.userId === user?.id ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {msg.username ? msg.username.slice(0, 2).toUpperCase() : 'AN'}
                  </AvatarFallback>
                </Avatar>
                <div className="group flex items-start gap-2">
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[85%] ${
                      msg.userId === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {msg.userId === user?.id ? "You" : msg.username}
                      </span>
                      <span className="text-xs opacity-50">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{msg.message}</p>
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {Object.entries(msg.reactions).map(([key, reaction]) => (
                          <Button
                            key={key}
                            variant="outline"
                            size="sm"
                            className="px-2 py-0 h-5 text-xs"
                            onClick={() => {
                              if (ws?.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                  type: 'reaction',
                                  messageId: msg.id,
                                  emoji: reaction.emoji,
                                  userId: user?.id
                                }));
                              }
                            }}
                          >
                            {reaction.emoji} {reaction.users.length}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Smile className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <EmojiPicker
                        onEmojiClick={(emoji) => {
                          if (ws?.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                              type: 'reaction',
                              messageId: msg.id,
                              emoji: emoji.emoji,
                              userId: user?.id
                            }));
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <form onSubmit={sendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <EmojiPicker
                  onEmojiClick={(emoji) => {
                    setNewMessage((prev) => prev + emoji.emoji);
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}