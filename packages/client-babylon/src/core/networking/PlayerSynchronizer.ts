import { Vector3, Quaternion } from '@babylonjs/core';
import { NetClient, ConnectionState } from './NetClient';
import type { PlayerCharacter } from '../entities/characters/PlayerCharacter';
import { CameraController } from '../camera/CameraController';

/**
 * PlayerSynchronizer - Sends local player data to server
 * Handles position/rotation updates with delta compression
 */
export class PlayerSynchronizer {
    private static instance: PlayerSynchronizer;
    private netClient: NetClient;
    private player: PlayerCharacter | null = null;
    private cameraController: CameraController | null = null;
    private syncInterval: number = 100; // ms between updates
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private lastSentPosition: Vector3 = Vector3.Zero();
    private lastSentRotation: Quaternion = Quaternion.Identity();
    private positionThreshold: number = 0.05; // Movement threshold to send update
    private rotationThreshold: number = 0.01; // Rotation threshold to send update

    private constructor() {
        this.netClient = NetClient.getInstance();
    }

    public static getInstance(): PlayerSynchronizer {
        if (!PlayerSynchronizer.instance) {
            PlayerSynchronizer.instance = new PlayerSynchronizer();
        }
        return PlayerSynchronizer.instance;
    }

    /**
     * Initialize with player and camera references
     */
    public initialize(player: PlayerCharacter, cameraController?: CameraController): void {
        this.player = player;
        this.cameraController = cameraController || null;
        console.log('[PlayerSync] Initialized with player');
    }

    /**
     * Set camera controller reference
     */
    public setCameraController(cameraController: CameraController): void {
        this.cameraController = cameraController;
    }

    /**
     * Start syncing player data to server
     */
    public startSyncInterval(): void {
        if (this.intervalId) {
            console.warn('[PlayerSync] Sync interval already running');
            return;
        }

        console.log('[PlayerSync] Starting sync interval');
        this.intervalId = setInterval(() => {
            this.syncPlayerData();
        }, this.syncInterval);
    }

    /**
     * Stop syncing player data
     */
    public stopSyncInterval(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[PlayerSync] Stopped sync interval');
        }
    }

    /**
     * Sync player data to server
     */
    private syncPlayerData(): void {
        // Check if we're connected
        if (this.netClient.getConnectionState() !== ConnectionState.CONNECTED) {
            return;
        }

        // Check if we have a player
        if (!this.player) {
            console.warn('[PlayerSync] No player to sync');
            return;
        }

        try {
            // Get current player position
            const position = this.player.getPosition();

            // Get current velocity (for movement state)
            const physicsComponent = this.player.getPhysicsComponent();
            const body = physicsComponent?.getBody();
            const velocity = body?.getLinearVelocity() || Vector3.Zero();

            // Get rotation from camera (Y rotation only - yaw)
            let rotation = Quaternion.Identity();
            if (this.cameraController) {
                const cameraRotation = this.cameraController.getRotation();
                // Create quaternion from Y rotation (yaw) only
                rotation = Quaternion.RotationYawPitchRoll(cameraRotation.y, 0, 0);
            }

            // Check if position or rotation has changed enough to send update
            const positionChanged = position.subtract(this.lastSentPosition).length() > this.positionThreshold;
            const rotationChanged = !Quaternion.AreClose(rotation, this.lastSentRotation, this.rotationThreshold);

            // Send update if position or rotation changed
            if (positionChanged || rotationChanged) {
                this.netClient.send('player_position', {
                    position: {
                        x: Math.round(position.x * 100) / 100, // Round to 2 decimals
                        y: Math.round(position.y * 100) / 100,
                        z: Math.round(position.z * 100) / 100
                    },
                    rotation: {
                        x: Math.round(rotation.x * 100) / 100,
                        y: Math.round(rotation.y * 100) / 100,
                        z: Math.round(rotation.z * 100) / 100,
                        w: Math.round(rotation.w * 100) / 100
                    },
                    velocity: {
                        x: Math.round(velocity.x * 100) / 100,
                        y: Math.round(velocity.y * 100) / 100,
                        z: Math.round(velocity.z * 100) / 100
                    },
                    timestamp: Date.now()
                });

                // Update last sent data
                this.lastSentPosition.copyFrom(position);
                this.lastSentRotation.copyFrom(rotation);
            }
        } catch (error) {
            console.error('[PlayerSync] Error syncing player data:', error);
        }
    }

    /**
     * Set sync interval (ms)
     */
    public setSyncInterval(intervalMs: number): void {
        this.syncInterval = intervalMs;

        // Restart interval if running
        if (this.intervalId) {
            this.stopSyncInterval();
            this.startSyncInterval();
        }
    }
}
