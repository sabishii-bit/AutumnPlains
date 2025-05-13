import { ConnectionManager } from '../network/ConnectionManager';
import { GameClient, GameMessage } from '../types/GameClient';
import { Logger } from '../utils/Logger';

/**
 * ChatBroadcast - Manages chat broadcasting between connected clients
 */
export class ChatBroadcast {
  private connectionManager: ConnectionManager;
  private logger: Logger;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.logger = Logger.getInstance();
  }

  /**
   * Process an incoming chat message and broadcast it to all clients
   * @param sender The client that sent the message
   * @param message The chat message data
   */
  public handleChatMessage(sender: GameClient, message: GameMessage): void {
    if (!message.data || !message.data.message) {
      this.logger.warn(`Invalid chat message format received from client ${sender.id}`);
      return;
    }

    const chatMessage = message.data.message.toString().trim();
    if (!chatMessage) {
      return; // Ignore empty messages
    }

    // Log the chat message
    this.logger.info(`Chat: [${sender.id}] ${chatMessage}`);

    // Broadcast the message to all connected clients
    this.broadcastMessage(sender.id, chatMessage);
  }

  /**
   * Broadcast a chat message to all connected clients
   * @param senderId The ID of the client who sent the message
   * @param text The message text
   */
  private broadcastMessage(senderId: string, text: string): void {
    const clients = this.connectionManager.getAllClients();
    const messagePacket = JSON.stringify({
      event: 'chat_message',
      data: {
        sender: senderId, // Using ClientID as the username
        message: text,
        timestamp: Date.now()
      }
    });

    // Send to all connected clients
    clients.forEach((client) => {
      try {
        client.send(messagePacket);
      } catch (err: unknown) {
        this.logger.error(`Failed to send chat message to client ${client.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  /**
   * Send a system message to all clients
   * @param text The message text to send
   */
  public sendSystemMessage(text: string): void {
    const clients = this.connectionManager.getAllClients();
    const messagePacket = JSON.stringify({
      event: 'chat_message',
      data: {
        sender: 'System',
        message: text,
        timestamp: Date.now()
      }
    });

    // Send to all connected clients
    clients.forEach((client) => {
      try {
        client.send(messagePacket);
      } catch (err: unknown) {
        this.logger.error(`Failed to send system message to client ${client.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  /**
   * Send a system message to all clients except one specific client
   * @param text The message text to send
   * @param excludeClientId The ID of the client to exclude
   */
  public sendSystemMessageToAllExcept(text: string, excludeClientId: string): void {
    const clients = this.connectionManager.getAllClients();
    const messagePacket = JSON.stringify({
      event: 'chat_message',
      data: {
        sender: 'System',
        message: text,
        timestamp: Date.now()
      }
    });

    // Send to all connected clients except the excluded one
    clients.forEach((client) => {
      // Skip the excluded client
      if (client.id === excludeClientId) {
        return;
      }
      
      try {
        client.send(messagePacket);
      } catch (err: unknown) {
        this.logger.error(`Failed to send system message to client ${client.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }
} 