import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import type { IncomingMessage } from 'http';

interface GameClient extends WebSocket {
  id: string;
  ip: string;
  publicIp?: string;
  userAgent: string;
}

/**
 * GameServer - Simple connection handler
 */
export class GameServer {
  private wss: WebSocketServer;
  private clients: Map<string, GameClient> = new Map();

  /**
   * Constructor - sets up WebSocket server on an existing HTTP server
   * @param httpServer Existing HTTP server instance
   */
  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.setupSocketHandlers();
    console.log(`WebSocket server initialized on shared HTTP server`);
  }

  /**
   * Get client IP address from request
   * Handles various proxy and direct connection scenarios
   */
  private getClientIp(req: IncomingMessage): string {
    // Debug what we receive
    console.log("Connection headers:", JSON.stringify(req.headers, null, 2));
    
    // Try to get IP from various headers in order of preference
    const headers = [
      'x-real-ip',
      'x-forwarded-for',
      'cf-connecting-ip',
      'true-client-ip',
      'x-client-ip',
      'x-forwarded',
      'forwarded-for',
      'forwarded'
    ];

    // Check each header
    for (const header of headers) {
      const value = req.headers[header];
      if (value) {
        // Handle array or string values
        const ip = Array.isArray(value) ? value[0] : value;
        // Split on comma and get first IP (in case of multiple)
        const firstIp = ip.split(',')[0].trim();
        console.log(`Found IP in ${header}:`, firstIp);
        return firstIp;
      }
    }

    // If no valid IP in headers, use socket address
    const socketIp = req.socket.remoteAddress;
    if (socketIp) {
      return socketIp;
    }

    // If still no valid IP, return unknown
    return 'unknown';
  }

  /**
   * Check if IP is a local/private network address
   */
  private isLocalConnection(ip: string): boolean {
    if (!ip) return false;
    
    return ip === '::1' || 
           ip === '127.0.0.1' || 
           ip.startsWith('192.168.') || 
           ip.startsWith('10.') || 
           (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31) ||
           ip.includes('localhost');
  }

  /**
   * Set up basic socket event handlers
   */
  private setupSocketHandlers(): void {
    this.wss.on('connection', (ws: GameClient, req: IncomingMessage) => {
      // Generate unique client ID
      const clientId = Math.random().toString(36).substring(2, 15);
      
      // Get client IP
      const clientIp = this.getClientIp(req);
      const isLocal = this.isLocalConnection(clientIp);
      
      // Store client information
      ws.id = clientId;
      ws.ip = clientIp;
      ws.userAgent = req.headers['user-agent'] || 'unknown';
      
      // Store client in our map
      this.clients.set(clientId, ws);

      // Log connection with IP only if not local
      if (isLocal) {
        console.log(`Client connected: ${clientId} (Local Connection)`);
      } else {
        console.log(`Client connected: ${clientId} (IP: ${ws.ip})`);
      }

      // Send connection confirmation with client info
      ws.send(JSON.stringify({ 
        event: 'connected',
        data: { 
          id: clientId,
          ip: ws.ip,
          isLocal: isLocal,
          timestamp: Date.now()
        }
      }));

      ws.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          
          // Log received message with appropriate details
          if (isLocal) {
            console.log(`Received message from ${clientId} (Local):`, parsedMessage);
          } else {
            console.log(`Received message from ${clientId} (IP: ${ws.ip}):`, parsedMessage);
          }
          
          // Handle client_info messages with public IP
          if (parsedMessage.event === 'client_info' && parsedMessage.data && parsedMessage.data.publicIp) {
            const publicIp = parsedMessage.data.publicIp;
            
            // Store the public IP with the client
            ws.publicIp = publicIp;
            
            // Send acknowledgment
            ws.send(JSON.stringify({
              event: 'client_info_received',
              data: {
                publicIp: publicIp,
                timestamp: Date.now()
              }
            }));
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        // Log disconnection appropriately
        if (isLocal) {
          console.log(`Client disconnected: ${clientId} (Local Connection)`);
        } else {
          console.log(`Client disconnected: ${clientId} (IP: ${ws.ip})`);
        }
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        // Log error appropriately
        if (isLocal) {
          console.error(`Error with client ${clientId} (Local):`, error);
        } else {
          console.error(`Error with client ${clientId} (IP: ${ws.ip}):`, error);
        }
        this.clients.delete(clientId);
      });
    });
  }

  /**
   * Get all connected clients
   */
  public getConnectedClients(): Map<string, GameClient> {
    return this.clients;
  }

  /**
   * Get client by ID
   */
  public getClient(clientId: string): GameClient | undefined {
    return this.clients.get(clientId);
  }
}
