import { WebSocketServer, WebSocket } from 'ws';

/**
 * GameServer - Simple connection handler
 */
export class GameServer {
  private wss: WebSocketServer;

  /**
   * Constructor - sets up connection handler
   * @param port Port number for WebSocket server
   */
  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setupSocketHandlers();
    console.log(`Game server initialized on port ${port}`);
  }
  
  /**
   * Set up basic socket event handlers
   */
  private setupSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      // Generate a unique ID for the client
      const clientId = Math.random().toString(36).substring(2, 15);
      console.log(`Client connected: ${clientId}`);
      
      // Send connection confirmation to the client
      ws.send(JSON.stringify({ 
        event: 'connected',
        data: { id: clientId }
      }));
      
      // Handle messages
      ws.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          console.log(`Received message from ${clientId}:`, parsedMessage);
          // Handle different message types here
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
      });
    });
  }
} 