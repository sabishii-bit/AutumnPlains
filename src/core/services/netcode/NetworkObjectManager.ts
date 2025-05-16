import { NetClient, ConnectionState } from './NetClient';
import { NetworkPlayerCharacter } from '../../entities/objects/characters/NetworkPlayerCharacter';
import { GameObjectManager } from '../../entities/GameObjectManager';
import * as THREE from 'three';

/**
 * Interface for position data received from the server
 */
interface NetworkPlayerPosition {
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
 * NetworkObjectManager - Manages network objects received from the server
 */
export class NetworkObjectManager {
  private static instance: NetworkObjectManager;
  private netClient: NetClient;
  private gameObjectManager: GameObjectManager;
  private networkPlayers: Map<string, NetworkPlayerCharacter> = new Map();
  private isInitialized: boolean = false;
  private updateListenersAdded: boolean = false;
  private positionInterpolationFactor: number = 0.25; // How quickly to interpolate to target position (0-1)
  
  /**
   * Helper method for network debugging
   */
  private netLog(message: string, data?: any): void {
    console.log(`%c[NETWORK] ${message}`, 'background: #006699; color: white; padding: 2px 4px; border-radius: 2px;', data || '');
  }
  
  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this.netClient = NetClient.getInstance();
    this.gameObjectManager = GameObjectManager.getInstance();
  }
  
  /**
   * Get the singleton instance of NetworkObjectManager
   */
  public static getInstance(): NetworkObjectManager {
    if (!NetworkObjectManager.instance) {
      NetworkObjectManager.instance = new NetworkObjectManager();
    }
    return NetworkObjectManager.instance;
  }
  
  /**
   * Initialize network object management and set up event listeners
   */
  public initialize(): void {
    if (this.isInitialized) return;
    
    console.log('Initializing NetworkObjectManager');
    this.setupEventListeners();
    this.isInitialized = true;
  }
  
  /**
   * Set up event listeners for network messages
   */
  private setupEventListeners(): void {
    if (this.updateListenersAdded) return;
    
    // Listen for player position updates from other clients
    document.addEventListener('socket_player_position_update', (event: any) => {
      this.handlePlayerPositionUpdate(event.detail);
    });
    
    // Listen for initial player positions when connecting
    document.addEventListener('socket_initial_player_positions', (event: any) => {
      this.handleInitialPlayerPositions(event.detail);
    });
    
    // Listen for player disconnection events
    document.addEventListener('socket_player_disconnected', (event: any) => {
      this.handlePlayerDisconnected(event.detail);
    });
    
    // Listen for connection state changes
    document.addEventListener('socket_connection_state_change', (event: any) => {
      this.handleConnectionStateChange(event.detail);
    });
    
    // Update NetClient message handler to dispatch custom events for our messages
    this.enhanceNetClientMessageHandler();
    
    this.updateListenersAdded = true;
    console.log('Network event listeners registered');
  }
  
  /**
   * Enhances the NetClient's message handler to dispatch custom events for our message types
   */
  private enhanceNetClientMessageHandler(): void {
    // This method is no longer needed since we're handling events directly in NetClient.ts
    // The event listeners are already set up in setupEventListeners()
    console.log('Network event handling is now managed directly by NetClient');
  }
  
  /**
   * Handle player position update from the server
   * @param data Position data received from the server
   */
  private handlePlayerPositionUpdate(data: NetworkPlayerPosition): void {
    if (!data) {
      console.warn('Received empty player position update');
      return;
    }
    
    if (!data.id) {
      console.warn('Received player position update without ID:', data);
      return;
    }
    
    if (!data.position) {
      console.warn('Received player position update without position data:', data);
      return;
    }
    
    // Validate position data contains valid numbers
    const pos = data.position;
    if (!isFinite(pos.x) || !isFinite(pos.y) || !isFinite(pos.z)) {
      console.warn('Received player position update with invalid position:', pos);
      return;
    }
    
    this.netLog(`Position update for player ${data.id}`, {
      x: pos.x.toFixed(2),
      y: pos.y.toFixed(2), 
      z: pos.z.toFixed(2),
      timestamp: new Date(data.timestamp).toISOString()
    });
    
    // Get or create the network player for this ID
    const networkPlayer = this.getOrCreateNetworkPlayer(data.id, data.position);
    
    // Make sure the player ID is set correctly
    networkPlayer.setNetworkPlayerId(data.id);
    
    // Update player position and rotation
    this.updatePlayerTransform(networkPlayer, data);
  }
  
  /**
   * Handle initial player positions received from the server
   * @param data Initial position data for all existing players
   */
  private handleInitialPlayerPositions(data: { players: NetworkPlayerPosition[] }): void {
    if (!data || !data.players || !Array.isArray(data.players)) {
      console.warn('Received invalid initial player positions:', data);
      return;
    }
    
    console.log(`Received initial positions for ${data.players.length} players`);
    
    // Create network players for each player in the list
    data.players.forEach(playerData => {
      if (playerData.id && playerData.position) {
        const networkPlayer = this.getOrCreateNetworkPlayer(playerData.id, playerData.position);
        this.updatePlayerTransform(networkPlayer, playerData);
      }
    });
  }
  
  /**
   * Handle player disconnection event
   * @param data Disconnection data containing the player ID
   */
  private handlePlayerDisconnected(data: { playerId: string }): void {
    if (!data || !data.playerId) {
      console.warn('Received invalid player disconnection:', data);
      return;
    }
    
    const playerId = data.playerId;
    const networkPlayer = this.networkPlayers.get(playerId);
    
    if (networkPlayer) {
      console.log(`Player ${playerId} disconnected, removing from game`);
      
      // Remove from the game object manager
      this.gameObjectManager.deleteObject(networkPlayer.getId());
      
      // Remove from our map
      this.networkPlayers.delete(playerId);
    }
  }
  
  /**
   * Handle connection state changes
   * @param data Connection state data
   */
  private handleConnectionStateChange(data: { previousState?: ConnectionState, state: ConnectionState }): void {
    const currentState = data.state;
    console.log(`Connection state changed to: ${currentState}`);
    
    // If we were disconnected but now we're connected, request initial data
    if (currentState === ConnectionState.CONNECTED && 
        data.previousState && (
        data.previousState === ConnectionState.DISCONNECTED ||
        data.previousState === ConnectionState.CONNECTING ||
        data.previousState === ConnectionState.RECONNECTING ||
        data.previousState === ConnectionState.CONNECTION_ERROR
        )) {
      console.log('Reconnected to server, cleaning up stale network players');
      this.cleanupAllNetworkPlayers();
    }
    
    // If we're disconnected, clean up network players
    if (currentState === ConnectionState.DISCONNECTED || 
        currentState === ConnectionState.CONNECTION_ERROR) {
      console.log('Disconnected from server, cleaning up network players');
      this.cleanupAllNetworkPlayers();
    }
  }
  
  /**
   * Get or create a network player for the given ID
   * @param playerId The player ID
   * @param position Initial position for new players
   * @returns The network player instance
   */
  private getOrCreateNetworkPlayer(
    playerId: string, 
    position: { x: number, y: number, z: number }
  ): NetworkPlayerCharacter {
    // Check if we already have this player
    let networkPlayer = this.networkPlayers.get(playerId);
    
    if (!networkPlayer) {
      console.log(`Creating new network player for ID: ${playerId}`);
      
      // Create a new position vector
      const playerPosition = new THREE.Vector3(position.x, position.y, position.z);
      
      // Create a new network player
      networkPlayer = new NetworkPlayerCharacter(playerPosition);
      
      // Set a custom ID for this network player based on the player ID
      networkPlayer.setId(`network_player_${playerId}`);
      
      // Also set the network player ID directly to ensure it shows correctly in the name tag
      networkPlayer.setNetworkPlayerId(playerId);
      
      // Store in our map
      this.networkPlayers.set(playerId, networkPlayer);
      
      // Add to the game object manager - already done in constructor, but ensuring it's there
      if (!this.gameObjectManager.getObject(networkPlayer.getId())) {
        this.gameObjectManager.addGameObject(networkPlayer);
      }
    }
    
    return networkPlayer;
  }
  
  /**
   * Update a network player's position and rotation
   * @param networkPlayer The network player to update
   * @param data The position data from the server
   */
  private updatePlayerTransform(
    networkPlayer: NetworkPlayerCharacter, 
    data: NetworkPlayerPosition
  ): void {
    if (!networkPlayer) {
      this.netLog('Cannot update transform: networkPlayer is null');
      return;
    }
    
    if (!data.position) {
      this.netLog('Cannot update transform: position data is missing');
      return;
    }
    
    // Create position and rotation from data
    const targetPosition = new THREE.Vector3(
      data.position.x,
      data.position.y,
      data.position.z
    );
    
    this.netLog(`Updating player ${networkPlayer.getId()} position`, {
      x: targetPosition.x.toFixed(2),
      y: targetPosition.y.toFixed(2),
      z: targetPosition.z.toFixed(2)
    });
    
    // Set target position for smooth interpolation
    networkPlayer.setTargetPosition(targetPosition);
    
    // Update rotation if available
    if (data.rotation) {
      const quaternion = new THREE.Quaternion(
        data.rotation.x,
        data.rotation.y,
        data.rotation.z,
        data.rotation.w
      );
      networkPlayer.setTargetRotation(quaternion);
      
      this.netLog(`Updated player ${networkPlayer.getId()} rotation`, {
        x: quaternion.x.toFixed(2),
        y: quaternion.y.toFixed(2),
        z: quaternion.z.toFixed(2),
        w: quaternion.w.toFixed(2)
      });
    }
    
    // Force redraw
    const mesh = networkPlayer.getMesh();
    if (mesh) {
      mesh.visible = true;
    }
  }
  
  /**
   * Clean up all network players when disconnected
   */
  private cleanupAllNetworkPlayers(): void {
    this.networkPlayers.forEach((player, id) => {
      console.log(`Removing network player ${id}`);
      this.gameObjectManager.deleteObject(player.getId());
    });
    
    this.networkPlayers.clear();
  }
  
  /**
   * Set the interpolation factor for smoother position updates
   * @param factor Interpolation factor (0-1), higher values = faster updates
   */
  public setInterpolationFactor(factor: number): void {
    this.positionInterpolationFactor = Math.max(0, Math.min(1, factor));
    
    // Also update all existing network players
    this.networkPlayers.forEach(player => {
      player.setInterpolationSpeed(factor);
    });
  }
  
  /**
   * Get all current network players
   * @returns Map of network players by player ID
   */
  public getAllNetworkPlayers(): Map<string, NetworkPlayerCharacter> {
    return this.networkPlayers;
  }
  
  /**
   * Get a specific network player by ID
   * @param playerId The player ID to get
   * @returns The network player or undefined if not found
   */
  public getNetworkPlayer(playerId: string): NetworkPlayerCharacter | undefined {
    return this.networkPlayers.get(playerId);
  }
} 