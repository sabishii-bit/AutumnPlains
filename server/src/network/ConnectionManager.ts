import { WebSocketServer } from 'ws';
import type { Server as HTTPServer } from 'http';
import type { IncomingMessage } from 'http';
import { GameClient, ClientInfo } from '../types/GameClient';
import { NetworkUtils } from '../utils/NetworkUtils';
import { MessageManager } from './MessageManager';
import { Logger } from '../utils/Logger';
import { ChatBroadcast } from '../system/ChatBroadcast';

export class ConnectionManager {
  private wss: WebSocketServer;
  private clients: Map<string, GameClient>;
  private messageManager: MessageManager | null = null;
  private chatBroadcast: ChatBroadcast | null = null;
  private logger: Logger;

  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.clients = new Map<string, GameClient>();
    this.logger = Logger.getInstance();
    this.setupConnectionListeners();
  }

  public setMessageManager(messageManager: MessageManager): void {
    this.messageManager = messageManager;
  }

  public setChatBroadcast(chatBroadcast: ChatBroadcast): void {
    this.chatBroadcast = chatBroadcast;
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
        this.logger.info(`Client connected: ${clientId} (Internal Connection)`);
      } else {
        this.logger.info(`Client connected: ${clientId} (IP: ${ws.ip})`);
      }

      // Send connection confirmation
      this.sendConnectionConfirmation(ws, clientId, clientIp, isInternal);

      // Setup client event listeners
      this.setupClientEventListeners(ws, clientId, isInternal);
      
      // Setup message handlers if available
      if (this.messageManager) {
        this.messageManager.setupMessageListeners(ws);
      }

      // Broadcast a connection notification after a short delay
      setTimeout(() => {
        if (this.chatBroadcast) {
          // Send the connection message to everyone except the connecting client
          this.chatBroadcast.sendSystemMessageToAllExcept(
            `Client ${clientId} has connected.`,
            clientId
          );
        }
      }, 500);
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
        this.logger.info(`Client disconnected: ${clientId} (Internal Connection)`);
      } else {
        this.logger.info(`Client disconnected: ${clientId} (IP: ${ws.ip})`);
      }
      
      // Remove client from the map
      this.clients.delete(clientId);
      
      // Clean up player position data when client disconnects
      if (this.messageManager) {
        try {
          const gameObjectSync = this.messageManager.getGameObjectSync();
          if (gameObjectSync) {
            gameObjectSync.removePlayer(clientId);
          }
        } catch (error) {
          this.logger.error(`Error cleaning up player data for ${clientId}:`, error);
        }
      }
      
      // Broadcast a disconnect notification
      if (this.chatBroadcast) {
        // Send the disconnection message to everyone except the disconnecting client
        this.chatBroadcast.sendSystemMessageToAllExcept(
          `Client ${clientId} has disconnected.`,
          clientId
        );
      }
    });

    ws.on('error', (error: any) => {
      if (isInternal) {
        this.logger.error(`Error with client ${clientId} (Internal):`, error);
      } else {
        this.logger.error(`Error with client ${clientId} (IP: ${ws.ip}):`, error);
      }
      
      // Remove client from the map
      this.clients.delete(clientId);
      
      // Clean up player position data on error
      if (this.messageManager) {
        try {
          const gameObjectSync = this.messageManager.getGameObjectSync();
          if (gameObjectSync) {
            gameObjectSync.removePlayer(clientId);
          }
        } catch (error) {
          this.logger.error(`Error cleaning up player data for ${clientId}:`, error);
        }
      }
    });
  }

  public getClient(clientId: string): GameClient | undefined {
    return this.clients.get(clientId);
  }

  public getAllClients(): Map<string, GameClient> {
    return this.clients;
  }
} 