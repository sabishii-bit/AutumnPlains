import { GameClient, GameMessage } from '../types/GameClient';
import { ConnectionManager } from './ConnectionManager';
import { NetworkUtils } from '../utils/NetworkUtils';
import { Logger } from '../utils/Logger';
import { ChatBroadcast } from '../system/ChatBroadcast';
import { GameObjectSync, PlayerPositionData } from '../game/GameObjectSync';

export class MessageManager {
  private connectionManager: ConnectionManager;
  private logger: Logger;
  private chatBroadcast: ChatBroadcast;
  private gameObjectSync: GameObjectSync;

  constructor(connectionManager: ConnectionManager, chatBroadcast: ChatBroadcast) {
    this.connectionManager = connectionManager;
    this.logger = Logger.getInstance();
    this.chatBroadcast = chatBroadcast;
    this.gameObjectSync = new GameObjectSync(connectionManager);
  }

  public setupMessageListeners(client: GameClient): void {
    client.on('message', (message: string) => {
      try {
        const parsedMessage = JSON.parse(message.toString()) as GameMessage;
        this.processMessage(client, parsedMessage);
      } catch (error) {
        this.logger.error('Error parsing message:', error);
      }
    });
    
    // Send current player positions to the new client
    this.gameObjectSync.sendAllPositionsToClient(client.id);
  }

  private processMessage(client: GameClient, message: GameMessage): void {
    const isInternal = NetworkUtils.isInternalConnection(client.ip);
    const clientId = client.id;

    // Log received message with appropriate details
    if (isInternal) {
      this.logger.debug(`Received message from ${clientId} (Internal):`, message);
    } else {
      this.logger.debug(`Received message from ${clientId} (IP: ${client.ip}):`, message);
    }

    // Handle different message types
    switch (message.event) {
      case 'ping':
        this.handlePing(client, message);
        break;
      case 'client_info':
        this.handleClientInfo(client, message);
        break;
      case 'chat_message':
        this.chatBroadcast.handleChatMessage(client, message);
        break;
      case 'player_position':
        this.handlePlayerPosition(client, message);
        break;
      default:
        this.logger.warn(`Unhandled message event: ${message.event}`);
    }
  }

  private handlePing(client: GameClient, message: GameMessage): void {
    client.send(JSON.stringify({
      event: 'pong',
      data: {
        received: message.data,
        serverTime: Date.now()
      }
    }));
  }

  private handleClientInfo(client: GameClient, message: GameMessage): void {
    if (message.data && message.data.publicIp) {
      const publicIp = message.data.publicIp;
      
      // Store the public IP with the client
      client.publicIp = publicIp;
      
      // Update logs with public IP for better tracking
      this.logger.info(`Client ${client.id} identified as public IP: ${publicIp}`);
      
      // Send acknowledgment
      client.send(JSON.stringify({
        event: 'client_info_received',
        data: {
          publicIp: publicIp,
          timestamp: Date.now()
        }
      }));
    }
  }
  
  /**
   * Handle player position updates from clients
   * @param client The client sending the update
   * @param message The position update message
   */
  private handlePlayerPosition(client: GameClient, message: GameMessage): void {
    if (!message.data) {
      this.logger.warn(`Received invalid player_position message from ${client.id}`);
      return;
    }
    
    try {
      // Validate the message data contains required position information
      const positionData = message.data as PlayerPositionData;
      
      // Ensure minimum required data is present
      if (!positionData.position || 
          typeof positionData.position.x !== 'number' ||
          typeof positionData.position.y !== 'number' ||
          typeof positionData.position.z !== 'number') {
        this.logger.warn(`Invalid position data from client ${client.id}`);
        return;
      }
      
      // Add timestamp if missing
      if (!positionData.timestamp) {
        positionData.timestamp = Date.now();
      }
      
      // Update and broadcast the player position
      this.gameObjectSync.updatePlayerPosition(client.id, positionData);
      
    } catch (error) {
      this.logger.error(`Error processing player position from ${client.id}:`, error);
    }
  }
  
  /**
   * Get the GameObjectSync instance
   * @returns The GameObjectSync instance
   */
  public getGameObjectSync(): GameObjectSync {
    return this.gameObjectSync;
  }
} 