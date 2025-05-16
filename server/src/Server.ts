import type { Server as HTTPServer } from 'http';
import { GameClient } from './types/GameClient';
import { ConnectionManager } from './network/ConnectionManager';
import { MessageManager } from './network/MessageManager';
import { Logger, LogLevel } from './utils/Logger';
import { ChatBroadcast } from './system/ChatBroadcast';
import { GameObjectSync, PlayerPositionData } from './game/GameObjectSync';

/**
 * GameServer - Main server class using modular components
 */
export class GameServer {
  private connectionManager: ConnectionManager;
  private messageManager: MessageManager;
  private chatBroadcast: ChatBroadcast;
  private gameObjectSync: GameObjectSync;
  private logger: Logger;

  /**
   * Constructor - sets up WebSocket server on an existing HTTP server
   * @param httpServer Existing HTTP server instance
   * @param options Optional server configuration
   */
  constructor(
    httpServer: HTTPServer,
    options: {
      logLevel?: LogLevel,
      logDir?: string,
      maxLogFileSize?: number
    } = {}
  ) {
    // Initialize logger first
    this.logger = Logger.getInstance({
      logLevel: options.logLevel,
      logDir: options.logDir,
      maxFileSize: options.maxLogFileSize
    });
    
    // Initialize connection manager
    this.connectionManager = new ConnectionManager(httpServer);
    
    // Initialize chat broadcast with connection manager reference
    this.chatBroadcast = new ChatBroadcast(this.connectionManager);
    
    // Initialize message manager with connection manager and chat broadcast references
    this.messageManager = new MessageManager(this.connectionManager, this.chatBroadcast);
    
    // Get reference to gameObjectSync from messageManager
    this.gameObjectSync = this.messageManager.getGameObjectSync();
    
    // Connect the components
    this.connectionManager.setMessageManager(this.messageManager);
    this.connectionManager.setChatBroadcast(this.chatBroadcast);
    
    this.logger.info('WebSocket server initialized on shared HTTP server');

    // Send welcome message
    this.sendWelcomeMessage();
  }

  /**
   * Send a welcome message to all clients
   */
  private sendWelcomeMessage(): void {
    // Short delay to let clients connect
    setTimeout(() => {
      this.chatBroadcast.sendSystemMessage('🌟 Welcome to Autumn Plains! You can chat with other connected players here.');
    }, 1500); // Slightly longer delay to ensure it appears after connection messages
  }

  /**
   * Get all connected clients
   */
  public getConnectedClients(): Map<string, GameClient> {
    return this.connectionManager.getAllClients();
  }

  /**
   * Get client by ID
   */
  public getClient(clientId: string): GameClient | undefined {
    return this.connectionManager.getClient(clientId);
  }
  
  /**
   * Get all player position data
   * @returns Map of player positions by client ID
   */
  public getAllPlayerPositions(): Map<string, PlayerPositionData> {
    return this.gameObjectSync.getAllPlayerPositions();
  }
  
  /**
   * Send a system message to all connected clients
   * @param message The message to broadcast
   */
  public broadcastSystemMessage(message: string): void {
    this.chatBroadcast.sendSystemMessage(message);
  }
  
  /**
   * Clean shutdown - close logger and other resources
   */
  public shutdown(): void {
    this.logger.info('Server shutting down...');
    this.broadcastSystemMessage('Server is shutting down...');
    this.logger.close();
  }
}
