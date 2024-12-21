import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { db } from '@db';
import { chatMessages, users } from '@db/schema';
import { eq } from 'drizzle-orm';

interface BaseMessage {
  userId: number;
  type?: string;
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

interface User {
  id: number;
  username: string | null;
  email: string | null;
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    noServer: true,
  });

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/api/ws/chat') {
      // Skip vite HMR connections
      const protocol = request.headers['sec-websocket-protocol'];
      if (protocol === 'vite-hmr') {
        return;
      }

      // Handle the upgrade
      try {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } catch (error) {
        console.error('WebSocket upgrade error:', error);
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  });

  const clients = new Set<WebSocket>();

  wss.on('connection', async (ws) => {
    clients.add(ws);
    console.log('Client connected to chat');

    // Send last 50 messages on connection
    try {
      const messages = await db
        .select({
          id: chatMessages.id,
          userId: chatMessages.userId,
          message: chatMessages.message,
          timestamp: chatMessages.timestamp,
          reactions: chatMessages.reactions,
          user: users
        })
        .from(chatMessages)
        .leftJoin(users, eq(chatMessages.userId, users.id))
        .orderBy(desc(chatMessages.timestamp))
        .limit(50);

      const formattedMessages = messages.map(msg => ({
        id: msg.id.toString(),
        userId: msg.userId,
        username: msg.user?.username || msg.user?.email?.split('@')[0] || 'Anonymous',
        message: msg.message,
        timestamp: msg.timestamp.toISOString(),
        reactions: msg.reactions
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
        if (!data) {
          console.error('Received empty message');
          return;
        }

        const parsedMessage = JSON.parse(data.toString()) as WebSocketMessage;

        if (!parsedMessage || typeof parsedMessage !== 'object') {
          console.error('Invalid message format');
          return;
        }

        // Handle reaction message
        if ('type' in parsedMessage && parsedMessage.type === 'reaction') {
          const reactionMessage = parsedMessage as ReactionMessage;
          const [updatedMessage] = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.id, parseInt(reactionMessage.messageId)));

          if (!updatedMessage) {
            console.error('Message not found:', reactionMessage.messageId);
            return;
          }

          const reactions = updatedMessage.reactions as Record<string, { emoji: string; users: number[] }>;
          const reactionKey = reactionMessage.emoji;

          if (!reactions[reactionKey]) {
            reactions[reactionKey] = { emoji: reactionMessage.emoji, users: [] };
          }

          const userIndex = reactions[reactionKey].users.indexOf(reactionMessage.userId);
          if (userIndex === -1) {
            reactions[reactionKey].users.push(reactionMessage.userId);
          } else {
            reactions[reactionKey].users.splice(userIndex, 1);
            if (reactions[reactionKey].users.length === 0) {
              delete reactions[reactionKey];
            }
          }

          await db
            .update(chatMessages)
            .set({ reactions })
            .where(eq(chatMessages.id, parseInt(reactionMessage.messageId)));

          // Broadcast reaction update
          const broadcastMessage = {
            type: 'reaction_update',
            messageId: reactionMessage.messageId,
            reactions
          };

          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(broadcastMessage));
            }
          });
        } 
        // Handle chat message
        else if ('message' in parsedMessage) {
          const chatMessage = parsedMessage as ChatMessage;
          const timestamp = new Date();
          const [savedMessage] = await db.insert(chatMessages).values({
            userId: chatMessage.userId,
            message: chatMessage.message,
            timestamp,
            reactions: {}
          }).returning();

          const user = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
          }).from(users)
            .where(eq(users.id, chatMessage.userId))
            .then(rows => rows[0]) as User | undefined;

          const username = user?.username || user?.email?.split('@')[0] || 'Anonymous';

          const broadcastMessage = {
            id: savedMessage.id.toString(),
            userId: savedMessage.userId,
            username,
            message: savedMessage.message,
            timestamp: savedMessage.timestamp.toISOString(),
            reactions: {}
          };

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