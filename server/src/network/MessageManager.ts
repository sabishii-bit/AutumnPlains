import { GameClient, GameMessage } from '../types/GameClient';
import { ConnectionManager } from './ConnectionManager';
import { NetworkUtils } from '../utils/NetworkUtils';

export class MessageManager {
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  public setupMessageListeners(client: GameClient): void {
    client.on('message', (message: string) => {
      try {
        const parsedMessage = JSON.parse(message.toString()) as GameMessage;
        this.processMessage(client, parsedMessage);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
  }

  private processMessage(client: GameClient, message: GameMessage): void {
    const isInternal = NetworkUtils.isInternalConnection(client.ip);
    const clientId = client.id;

    // Log received message with appropriate details
    if (isInternal) {
      console.log(`Received message from ${clientId} (Internal):`, message);
    } else {
      console.log(`Received message from ${clientId} (IP: ${client.ip}):`, message);
    }

    // Handle different message types
    switch (message.event) {
      case 'ping':
        this.handlePing(client, message);
        break;
      case 'client_info':
        this.handleClientInfo(client, message);
        break;
      default:
        console.log(`Unhandled message event: ${message.event}`);
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
      console.log(`Client ${client.id} identified as public IP: ${publicIp}`);
      
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
} 