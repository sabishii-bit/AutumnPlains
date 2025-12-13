import { NetClient, ConnectionState } from './NetClient';
import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import * as THREE from 'three';
import { NetworkManager } from './NetworkManager';

/**
 * PlayerSynchronizer - Handles sending the local player's data to the server
 */
export class PlayerSynchronizer {
  private static instance: PlayerSynchronizer;

  private netClient: NetClient;
  private player: PlayerCharacter | null = null;
  private syncInterval: number = 100; // milliseconds between sync updates
  private intervalId: number | null = null;
  private lastSentPosition: THREE.Vector3 = new THREE.Vector3();
  private lastSentRotation: THREE.Quaternion = new THREE.Quaternion();
  private positionThreshold: number = 0.05; // Movement threshold to send updates
  private rotationThreshold: number = 0.01; // Rotation threshold to send updates
  private lastUpdateTime: number = 0;
  private lastActivityTime: number = 0;
  private afkCheckInterval: number | null = null;
  private isAfk: boolean = false;
  private lastPlayerState: string = '';

  private readonly afkTimeout: number = 60000; // 1 minute in milliseconds
  
  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this.netClient = NetClient.getInstance();
    this.setupActivityTracking();
  }
  
  /**
   * Get the singleton instance of PlayerSynchronizer
   */
  public static getInstance(): PlayerSynchronizer {
    if (!PlayerSynchronizer.instance) {
      PlayerSynchronizer.instance = new PlayerSynchronizer();
    }
    return PlayerSynchronizer.instance;
  }
  
  /**
   * Set up activity tracking for AFK detection
   */
  private setupActivityTracking(): void {
    // Track keyboard and mouse input
    const activityEvents = [
      'keydown',
      'keyup',
      'mousedown',
      'mouseup',
      'mousemove',
      'click',
      'touchstart',
      'touchmove'
    ];

    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivityTime();
      });
    });

    // Track chat messages from the chat component
    document.addEventListener('chat_message_sent', () => {
      this.updateLastActivityTime();
    });

    // Start AFK check interval
    this.afkCheckInterval = window.setInterval(() => {
      this.checkAfkStatus();
    }, 1000); // Check every second
  }
  
  /**
   * Update the last activity timestamp
   */
  private updateLastActivityTime(): void {
    this.lastActivityTime = Date.now();
    
    // Check if we were AFK and attempt to reconnect
    if (this.isAfk) {
      this.isAfk = false;
      console.log('Player is no longer AFK, attempting to reconnect...');
      
      // Get the current connection state
      const connectionState = this.netClient.getConnectionState();
      
      // If we're disconnected due to AFK, attempt to reconnect
      if (connectionState === ConnectionState.DISCONNECTED_BY_AFK) {
        // Get the NetworkManager instance
        const networkManager = NetworkManager.getInstance();
        
        // Attempt to reconnect
        networkManager.connectToServer()
          .then(() => {
            console.log('Successfully reconnected after AFK');
          })
          .catch(error => {
            console.error('Failed to reconnect after AFK:', error);
          });
      }
    }
  }
  
  /**
   * Check if the player is AFK and handle disconnection if needed
   */
  private checkAfkStatus(): void {
    if (!this.netClient.isConnected()) return;

    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    if (timeSinceLastActivity >= this.afkTimeout && !this.isAfk) {
      this.isAfk = true;
      console.log('Player is now AFK');
      
      // Set the connection state to AFK before disconnecting
      this.netClient.setConnectionState(ConnectionState.DISCONNECTED_BY_AFK);
      
      // Small delay to ensure the state is set before disconnecting
      setTimeout(() => {
        // Disconnect from server
        this.netClient.disconnect();
      }, 100);
    }
  }
  
  /**
   * Initialize the player synchronizer with the local player
   * @param player The local player character instance
   */
  public initialize(player: PlayerCharacter): void {
    this.player = player;
    this.lastSentPosition.copy(player.getPosition());
    this.lastActivityTime = Date.now(); // Initialize activity time
    this.lastPlayerState = player.getCurrentState()?.getStateName() || '';
    
    // Start sync interval if not already running
    this.startSyncInterval();
  }
  
  /**
   * Start the sync interval
   */
  public startSyncInterval(): void {
    if (this.intervalId !== null) {
      // Clear existing interval if it exists
      window.clearInterval(this.intervalId);
    }
    
    // Start new interval
    this.intervalId = window.setInterval(() => {
      this.synchronizePlayer();
    }, this.syncInterval);
    
    console.log(`PlayerSynchronizer started with ${this.syncInterval}ms interval`);
  }
  
  /**
   * Stop the sync interval
   */
  public stopSyncInterval(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.afkCheckInterval !== null) {
      window.clearInterval(this.afkCheckInterval);
      this.afkCheckInterval = null;
    }
    
    console.log('PlayerSynchronizer stopped');
  }
  
  /**
   * Set the synchronization interval
   * @param interval Interval in milliseconds
   */
  public setSyncInterval(interval: number): void {
    this.syncInterval = interval;
    
    // Restart interval with new timing if running
    if (this.intervalId !== null) {
      this.startSyncInterval();
    }
  }
  
  /**
   * Synchronize the player's position with the server
   */
  private synchronizePlayer(): void {
    if (!this.player || !this.netClient.isConnected()) {
      return;
    }
    
    // Get current position and rotation
    const currentPosition = this.player.getPosition();
    
    // Check if we need to send an update
    const shouldUpdate = this.shouldSendUpdate(currentPosition);
    
    if (shouldUpdate) {
      // Create position data to send
      const characterBody = this.player.getCollisionBody();
      const velocity = new THREE.Vector3();
      
      // If character body exists, get its velocity
      if (characterBody && characterBody.velocity) {
        velocity.copy(characterBody.velocity);
      }
      
      // Get the player mesh to extract rotation
      const mesh = this.player.getMesh();
      const quaternion = mesh?.quaternion || new THREE.Quaternion();
      
      // Log position data being sent (for debugging)
      console.log('Sending player position:', {
        position: {
          x: currentPosition.x.toFixed(2),
          y: currentPosition.y.toFixed(2),
          z: currentPosition.z.toFixed(2)
        },
        velocity: {
          x: velocity.x.toFixed(6),
          y: velocity.y.toFixed(6),
          z: velocity.z.toFixed(6)
        }
      });
      
      // Send position update to server
      this.netClient.send('player_position', {
        position: {
          x: currentPosition.x,
          y: currentPosition.y,
          z: currentPosition.z
        },
        rotation: {
          x: quaternion.x,
          y: quaternion.y,
          z: quaternion.z,
          w: quaternion.w
        },
        velocity: {
          x: velocity.x,
          y: velocity.y,
          z: velocity.z
        },
        timestamp: Date.now()
      });
      
      // Update last sent data
      this.lastSentPosition.copy(currentPosition);
      if (mesh) {
        this.lastSentRotation.copy(mesh.quaternion);
      }
      this.lastUpdateTime = Date.now();
    }
  }
  
  /**
   * Determine if we should send an update based on thresholds
   * @param currentPosition Current player position
   * @returns Whether an update should be sent
   */
  private shouldSendUpdate(currentPosition: THREE.Vector3): boolean {
    // Calculate distance moved since last update
    const distanceMoved = this.lastSentPosition.distanceTo(currentPosition);
    
    // Get the player mesh to check rotation
    const mesh = this.player?.getMesh();
    const currentRotation = mesh?.quaternion || new THREE.Quaternion();
    
    // Calculate rotation difference
    const rotationDiff = 1 - this.lastSentRotation.dot(currentRotation);
    
    // Check if position or rotation exceeds threshold
    const positionChanged = distanceMoved > this.positionThreshold;
    const rotationChanged = rotationDiff > this.rotationThreshold;
    
    // Check if player state has changed
    const currentState = this.player?.getCurrentState()?.getStateName() || '';
    const stateChanged = currentState !== this.lastPlayerState;
    if (stateChanged) {
      this.lastPlayerState = currentState;
      this.updateLastActivityTime();
    }
    
    // Always send at least one update every second regardless of movement
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
    const forceUpdate = timeSinceLastUpdate > 1000;
    
    return positionChanged || rotationChanged || stateChanged || forceUpdate;
  }
  
  /**
   * Set position change threshold for sending updates
   * @param threshold Threshold value (distance units)
   */
  public setPositionThreshold(threshold: number): void {
    this.positionThreshold = threshold;
  }
  
  /**
   * Set rotation change threshold for sending updates
   * @param threshold Threshold value (0-1)
   */
  public setRotationThreshold(threshold: number): void {
    this.rotationThreshold = threshold;
  }
  
  /**
   * Force send a position update immediately
   */
  public forceSendUpdate(): void {
    this.synchronizePlayer();
  }

  /**
   * Get the current AFK status
   * @returns Whether the player is currently AFK
   */
  public isPlayerAfk(): boolean {
    return this.isAfk;
  }

  /**
   * Get the time until AFK disconnection
   * @returns Time in milliseconds until AFK disconnection, or -1 if not connected
   */
  public getTimeUntilAfkDisconnect(): number {
    if (!this.netClient.isConnected()) return -1;
    
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    return Math.max(0, this.afkTimeout - timeSinceLastActivity);
  }
} 