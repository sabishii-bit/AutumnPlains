import { NetClient } from './NetClient';
import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import * as THREE from 'three';

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
  
  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this.netClient = NetClient.getInstance();
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
   * Initialize the player synchronizer with the local player
   * @param player The local player character instance
   */
  public initialize(player: PlayerCharacter): void {
    this.player = player;
    this.lastSentPosition.copy(player.getPosition());
    
    // Start sync interval if not already running
    this.startSyncInterval();
  }
  
  /**
   * Start the sync interval
   */
  private startSyncInterval(): void {
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
      console.log('PlayerSynchronizer stopped');
    }
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
    
    // Always send at least one update every second regardless of movement
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
    const forceUpdate = timeSinceLastUpdate > 1000;
    
    return positionChanged || rotationChanged || forceUpdate;
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
} 