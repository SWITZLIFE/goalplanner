import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { db } from '@db';
import { chatMessages, users } from '@db/schema';
import { eq } from 'drizzle-orm';

interface BaseMessage {
  userId: number;
}

interface ChatMessage extends BaseMessage {
  username?: string;
  message: string;
  timestamp: string;
}

interface ReactionMessage extends BaseMessage {
  type: 'reaction';
  messageId: string;
  emoji: string;
}

type WebSocketMessage = ChatMessage | ReactionMessage;

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true,
  });

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/api/ws/chat') {
      // Skip vite HMR connections
      if (request.headers['sec-websocket-protocol'] === 'vite-hmr') {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  const clients = new Set<WebSocket>();

  wss.on('connection', async (ws) => {
    clients.add(ws);
    console.log('Client connected to chat');

    // Send last 50 messages on connection
    try {
      const messages = await db.query.chatMessages.findMany({
        orderBy: (messages, { desc }) => [desc(messages.timestamp)],
        limit: 50,
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      const formattedMessages = messages.map(msg => ({
        id: msg.id.toString(),
        userId: msg.userId,
        username: msg.user?.username || msg.user?.email?.split('@')[0] || 'Anonymous',
        message: msg.message,
        timestamp: msg.timestamp.toISOString()
      }));

      ws.send(JSON.stringify({
        type: 'initial',
        messages: formattedMessages.reverse()
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to load messages' }));
    }

    ws.on('message', async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());

        if ('type' in message && message.type === 'reaction') {
          // Handle reaction
          const [updatedMessage] = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.id, parseInt(message.messageId)));

          if (!updatedMessage) {
            console.error('Message not found:', message.messageId);
            return;
          }

          const reactions = updatedMessage.reactions as Record<string, { emoji: string; users: number[] }>;
          const reactionKey = message.emoji;
          
          if (!reactions[reactionKey]) {
            reactions[reactionKey] = { emoji: message.emoji, users: [] };
          }

          const userIndex = reactions[reactionKey].users.indexOf(message.userId);
          if (userIndex === -1) {
            reactions[reactionKey].users.push(message.userId);
          } else {
            reactions[reactionKey].users.splice(userIndex, 1);
            if (reactions[reactionKey].users.length === 0) {
              delete reactions[reactionKey];
            }
          }

          await db
            .update(chatMessages)
            .set({ reactions })
            .where(eq(chatMessages.id, parseInt(message.messageId)));

          // Broadcast reaction update
          const broadcastMessage = {
            type: 'reaction_update',
            messageId: message.messageId,
            reactions
          };

          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(broadcastMessage));
            }
          });
        } else {
          // Handle new message
          // Handle new message
          const timestamp = new Date();
          const [savedMessage] = await db.insert(chatMessages).values({
            userId: message.userId,
            message: message.message,
            timestamp,
            reactions: {}
          }).returning();

          // Get user info
          const user = await db.query.users.findFirst({
            where: eq(users.id, message.userId),
            columns: {
              id: true,
              username: true,
              email: true
            }
          });

          let username = 'Anonymous';
          if (user) {
            username = user.username || (user.email ? user.email.split('@')[0] : 'Anonymous');
          }

          const broadcastMessage = {
            id: savedMessage.id.toString(),
            userId: savedMessage.userId,
            username: username,
            message: savedMessage.message,
            timestamp: savedMessage.timestamp.toISOString(),
            reactions: {}
          };

          // Broadcast to all connected clients
          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(broadcastMessage));
            }
          });
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  return wss;
}
