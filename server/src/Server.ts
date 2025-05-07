import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';

/**
 * GameServer - Simple connection handler
 */
export class GameServer {
  private wss: WebSocketServer;

  /**
   * Constructor - sets up WebSocket server on an existing HTTP server
   * @param httpServer Existing HTTP server instance
   */
  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer }); // <-- fix: share HTTP server
    this.setupSocketHandlers();
    console.log(`WebSocket server initialized on shared HTTP server`);
  }

  /**
   * Set up basic socket event handlers
   */
  private setupSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = Math.random().toString(36).substring(2, 15);
      console.log(`Client connected: ${clientId}`);

      ws.send(JSON.stringify({ 
        event: 'connected',
        data: { id: clientId }
      }));

      ws.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          console.log(`Received message from ${clientId}:`, parsedMessage);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
      });
    });
  }
}
