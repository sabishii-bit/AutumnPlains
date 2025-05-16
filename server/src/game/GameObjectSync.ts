import { GameClient } from '../types/GameClient';
import { ConnectionManager } from '../network/ConnectionManager';
import { Logger } from '../utils/Logger';

/**
 * Interface for position data received from clients
 */
export interface PlayerPositionData {
  id: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation?: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  velocity?: {
    x: number;
    y: number;
    z: number;
  };
  timestamp: number;
}

/**
 * Manages the synchronization of game objects between connected clients
 */
export class GameObjectSync {
  private connectionManager: ConnectionManager;
  private logger: Logger;
  private playerPositions: Map<string, PlayerPositionData> = new Map();
  
  /**
   * Creates a new GameObjectSync instance
   * @param connectionManager The connection manager reference
   */
  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.logger = Logger.getInstance();
  }
  
  /**
   * Updates player position data from a client
   * @param clientId The client ID
   * @param positionData The position data
   */
  public updatePlayerPosition(clientId: string, positionData: PlayerPositionData): void {
    // Ensure the position data has the correct client ID
    positionData.id = clientId;
    
    // Store the updated position
    this.playerPositions.set(clientId, positionData);
    
    // Broadcast the position update to all other clients
    this.broadcastPlayerPosition(clientId, positionData);
  }
  
  /**
   * Broadcast player position data to all other clients
   * @param sourceClientId The source client ID to exclude from broadcast
   * @param positionData The position data to broadcast
   */
  private broadcastPlayerPosition(sourceClientId: string, positionData: PlayerPositionData): void {
    const clients = this.connectionManager.getAllClients();
    let broadcastCount = 0;
    
    clients.forEach((client, clientId) => {
      // Don't send the update back to the source client
      if (clientId !== sourceClientId) {
        try {
          client.send(JSON.stringify({
            event: 'player_position_update',
            data: positionData
          }));
          broadcastCount++;
        } catch (error) {
          this.logger.error(`Error broadcasting position to client ${clientId}:`, error);
        }
      }
    });
  }
  
  /**
   * Sends all current player positions to a newly connected client
   * @param clientId The client ID to send positions to
   */
  public sendAllPositionsToClient(clientId: string): void {
    const client = this.connectionManager.getClient(clientId);
    if (!client) {
      this.logger.warn(`Cannot send positions to unknown client: ${clientId}`);
      return;
    }
    
    const otherPlayers: PlayerPositionData[] = [];
    
    // Collect all other player positions
    this.playerPositions.forEach((positionData, playerId) => {
      if (playerId !== clientId) {
        otherPlayers.push(positionData);
      }
    });
    
    // Send the initial positions to the client
    if (otherPlayers.length > 0) {
      try {
        client.send(JSON.stringify({
          event: 'initial_player_positions',
          data: {
            players: otherPlayers
          }
        }));
        
      } catch (error) {
        this.logger.error(`Error sending initial positions to client ${clientId}:`, error);
      }
    }
  }
  
  /**
   * Removes a client's position data when they disconnect
   * @param clientId The client ID to remove
   */
  public removePlayer(clientId: string): void {
    if (this.playerPositions.has(clientId)) {
      this.playerPositions.delete(clientId);
      
      // Notify all other clients that this player has disconnected
      const clients = this.connectionManager.getAllClients();
      
      clients.forEach((client, id) => {
        if (id !== clientId) {
          try {
            client.send(JSON.stringify({
              event: 'player_disconnected',
              data: {
                playerId: clientId
              }
            }));
          } catch (error) {
            this.logger.error(`Error notifying client ${id} about disconnection:`, error);
          }
        }
      });
    }
  }
  
  /**
   * Gets all current player positions
   * @returns Map of player positions by client ID
   */
  public getAllPlayerPositions(): Map<string, PlayerPositionData> {
    return this.playerPositions;
  }
} 