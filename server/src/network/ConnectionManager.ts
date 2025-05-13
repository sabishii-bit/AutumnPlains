import { WebSocketServer } from 'ws';
import type { Server as HTTPServer } from 'http';
import type { IncomingMessage } from 'http';
import { GameClient, ClientInfo } from '../types/GameClient';
import { NetworkUtils } from '../utils/NetworkUtils';
import { MessageManager } from './MessageManager';

export class ConnectionManager {
  private wss: WebSocketServer;
  private clients: Map<string, GameClient>;
  private messageManager: MessageManager | null = null;

  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.clients = new Map<string, GameClient>();
    this.setupConnectionListeners();
  }

  public setMessageManager(messageManager: MessageManager): void {
    this.messageManager = messageManager;
  }

  private setupConnectionListeners(): void {
    this.wss.on('connection', (ws: GameClient, req: IncomingMessage) => {
      const clientId = Math.random().toString(36).substring(2, 15);
      
      // Get client IP and determine if internal
      const clientIp = NetworkUtils.getClientIp(req);
      const isInternal = NetworkUtils.isInternalConnection(clientIp);
      
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

      // Send connection confirmation
      this.sendConnectionConfirmation(ws, clientId, clientIp, isInternal);

      // Setup client event listeners
      this.setupClientEventListeners(ws, clientId, isInternal);
      
      // Setup message handlers if available
      if (this.messageManager) {
        this.messageManager.setupMessageListeners(ws);
      }
    });
  }

  private sendConnectionConfirmation(ws: GameClient, clientId: string, clientIp: string, isInternal: boolean): void {
    const clientInfo: ClientInfo = {
      id: clientId,
      ip: clientIp,
      isLocal: isInternal,
      timestamp: Date.now()
    };

    ws.send(JSON.stringify({
      event: 'connected',
      data: clientInfo
    }));
  }

  private setupClientEventListeners(ws: GameClient, clientId: string, isInternal: boolean): void {
    ws.on('close', () => {
      if (isInternal) {
        console.log(`Client disconnected: ${clientId} (Internal Connection)`);
      } else {
        console.log(`Client disconnected: ${clientId} (IP: ${ws.ip})`);
      }
      this.clients.delete(clientId);
    });

    ws.on('error', (error) => {
      if (isInternal) {
        console.error(`Error with client ${clientId} (Internal):`, error);
      } else {
        console.error(`Error with client ${clientId} (IP: ${ws.ip}):`, error);
      }
      this.clients.delete(clientId);
    });
  }

  public getClient(clientId: string): GameClient | undefined {
    return this.clients.get(clientId);
  }

  public getAllClients(): Map<string, GameClient> {
    return this.clients;
  }
} 