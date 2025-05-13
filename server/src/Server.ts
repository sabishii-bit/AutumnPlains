import type { Server as HTTPServer } from 'http';
import { GameClient } from './types/GameClient';
import { ConnectionManager } from './network/ConnectionManager';
import { MessageManager } from './network/MessageManager';
import { Logger, LogLevel } from './utils/Logger';

/**
 * GameServer - Main server class using modular components
 */
export class GameServer {
  private connectionManager: ConnectionManager;
  private messageManager: MessageManager;
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
    
    // Initialize message manager with connection manager reference
    this.messageManager = new MessageManager(this.connectionManager);
    
    // Link the connection manager with the message manager
    this.connectionManager.setMessageManager(this.messageManager);
    
    this.logger.info('WebSocket server initialized on shared HTTP server');
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
   * Clean shutdown - close logger and other resources
   */
  public shutdown(): void {
    this.logger.info('Server shutting down...');
    this.logger.close();
  }
}
