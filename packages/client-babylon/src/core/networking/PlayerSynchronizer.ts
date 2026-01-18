import { Vector3, Quaternion } from '@babylonjs/core';
import { NetClient, ConnectionState } from './NetClient';
import type { PlayerCharacter } from '../entities/characters/PlayerCharacter';

/**
 * PlayerSynchronizer - Sends local player data to server
 * Handles position/rotation updates with delta compression
 */
export class PlayerSynchronizer {
    private static instance: PlayerSynchronizer;
    private netClient: NetClient;
    private player: PlayerCharacter | null = null;
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
     * Initialize with player reference
     */
    public initialize(player: PlayerCharacter): void {
        this.player = player;
        console.log('[PlayerSync] Initialized with player');
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
            const movementComponent = this.player.getMovementComponent();
            const velocity = movementComponent ? movementComponent.getVelocity() : Vector3.Zero();

            // Check if position has changed enough to send update
            const positionChanged = position.subtract(this.lastSentPosition).length() > this.positionThreshold;

            // Send update if position changed
            if (positionChanged) {
                this.netClient.send('player_update', {
                    position: {
                        x: Math.round(position.x * 100) / 100, // Round to 2 decimals
                        y: Math.round(position.y * 100) / 100,
                        z: Math.round(position.z * 100) / 100
                    },
                    velocity: {
                        x: Math.round(velocity.x * 100) / 100,
                        y: Math.round(velocity.y * 100) / 100,
                        z: Math.round(velocity.z * 100) / 100
                    }
                });

                // Update last sent position
                this.lastSentPosition.copyFrom(position);
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
