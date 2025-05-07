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
  // Docker network prefixes to identify internal IPs
  private readonly dockerNetworkPrefixes = ['172.', '10.', '192.168.', '::ffff:172.', '::ffff:10.', '::ffff:192.168.'];

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
    // Debug headers to help diagnose connection issues
    console.log("Connection headers:", JSON.stringify(req.headers, null, 2));
    
    // Try to get IP from various headers in order of preference
    const headers = [
      'x-real-ip',           // Nginx proxy
      'x-forwarded-for',     // Standard proxy header
      'cf-connecting-ip',    // Cloudflare
      'true-client-ip',      // Akamai and Cloudflare
      'x-client-ip',         // Custom header
      'forwarded-for',       // Standard proxy header
      'forwarded'            // Standard proxy header
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
   * Check if IP is a local/private network address or Docker network
   */
  private isInternalConnection(ip: string): boolean {
    if (!ip) return false;
    
    // Check for localhost
    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost')) {
      return true;
    }
    
    // Check for Docker or private network IPs
    for (const prefix of this.dockerNetworkPrefixes) {
      if (ip.startsWith(prefix)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Set up basic socket event handlers
   */
  private setupSocketHandlers(): void {
    this.wss.on('connection', (ws: GameClient, req: IncomingMessage) => {
      const clientId = Math.random().toString(36).substring(2, 15);
      
      // Get client IP
      const clientIp = this.getClientIp(req);
      const isInternal = this.isInternalConnection(clientIp);
      
      // Store client information
      ws.id = clientId;
      ws.ip = clientIp;
      ws.userAgent = req.headers['user-agent'] || 'unknown';
      
      // Store client in our map
      this.clients.set(clientId, ws);

      // Log connection with IP only if not internal
      if (isInternal) {
        console.log(`Client connected: ${clientId} (Internal Connection)`);
      } else {
        console.log(`Client connected: ${clientId} (IP: ${ws.ip})`);
      }

      // Send connection confirmation with client info
      ws.send(JSON.stringify({ 
        event: 'connected',
        data: { 
          id: clientId,
          ip: ws.ip,
          isLocal: isInternal,
          timestamp: Date.now()
        }
      }));

      ws.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          
          // Log received message with appropriate details
          if (isInternal) {
            console.log(`Received message from ${clientId} (Internal):`, parsedMessage);
          } else {
            console.log(`Received message from ${clientId} (IP: ${ws.ip}):`, parsedMessage);
          }
          
          // Handle client_info messages with public IP
          if (parsedMessage.event === 'client_info' && parsedMessage.data && parsedMessage.data.publicIp) {
            const publicIp = parsedMessage.data.publicIp;
            
            // Store the public IP with the client
            ws.publicIp = publicIp;
            
            // Update logs with public IP for better tracking
            console.log(`Client ${clientId} identified as public IP: ${publicIp}`);
            
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
        if (isInternal) {
          console.log(`Client disconnected: ${clientId} (Internal Connection)`);
        } else {
          console.log(`Client disconnected: ${clientId} (IP: ${ws.ip})`);
        }
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        // Log error appropriately
        if (isInternal) {
          console.error(`Error with client ${clientId} (Internal):`, error);
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
