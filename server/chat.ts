import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { db } from '@db';
import { chatMessages, users } from '@db/schema';
import { eq } from 'drizzle-orm';

interface ChatMessage {
  userId: number;
  username: string;
  message: string;
  timestamp: string;
}

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
        const message: ChatMessage = JSON.parse(data.toString());
        
        // Store message in database
        const [savedMessage] = await db.insert(chatMessages).values({
          userId: message.userId,
          message: message.message,
          timestamp: new Date(message.timestamp)
        }).returning();

        // Get user info
        const user = await db.query.users.findFirst({
          where: eq(users.id, message.userId),
        });

        const broadcastMessage = {
          id: savedMessage.id.toString(),
          userId: savedMessage.userId,
          username: user?.username || user?.email.split('@')[0],
          message: savedMessage.message,
          timestamp: savedMessage.timestamp.toISOString()
        };

        // Broadcast to all connected clients
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(broadcastMessage));
          }
        });
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
