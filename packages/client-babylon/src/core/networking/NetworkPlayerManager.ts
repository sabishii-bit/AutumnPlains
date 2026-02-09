import { Vector3, Scene } from '@babylonjs/core';
import { NetClient } from './NetClient';
import { WebRTCManager } from './WebRTCManager';
import { RemotePlayer } from '../entities/characters/RemotePlayer';

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
 * NetworkPlayerManager - Manages remote players in the game world
 * Handles spawning, updating, and despawning of other players
 */
export class NetworkPlayerManager {
    private static instance: NetworkPlayerManager;

    private netClient: NetClient;
    private webrtcManager: WebRTCManager;
    private scene: Scene | null = null;
    private remotePlayers: Map<string, RemotePlayer> = new Map();
    private isInitialized: boolean = false;

    private constructor() {
        this.netClient = NetClient.getInstance();
        this.webrtcManager = WebRTCManager.getInstance();
    }

    public static getInstance(): NetworkPlayerManager {
        if (!NetworkPlayerManager.instance) {
            NetworkPlayerManager.instance = new NetworkPlayerManager();
        }
        return NetworkPlayerManager.instance;
    }

    /**
     * Initialize the network player manager
     * @param scene Babylon.js scene
     */
    public initialize(scene: Scene): void {
        if (this.isInitialized) {
            console.warn('[NetworkPlayerManager] Already initialized');
            return;
        }

        this.scene = scene;
        this.setupEventListeners();
        this.setupWebRTCListener();
        this.isInitialized = true;

        console.log('[NetworkPlayerManager] Initialized');
    }

    /**
     * Set up event listeners for network messages
     */
    private setupEventListeners(): void {
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

        // Listen for connection state changes to cleanup on disconnect
        document.addEventListener('socket_connection_state_change', (event: any) => {
            this.handleConnectionStateChange(event.detail);
        });

        console.log('[NetworkPlayerManager] Event listeners registered');
    }

    /**
     * Set up WebRTC data listener for direct peer-to-peer position updates
     */
    private setupWebRTCListener(): void {
        this.webrtcManager.onPlayerData((playerId, message) => {
            // Handle WebRTC messages (player_position updates)
            if (message.type === 'player_position' && message.data) {
                // Add the player ID to the data
                const data = { ...message.data, id: playerId };
                this.handlePlayerPositionUpdate(data);
            }
        });
    }

    /**
     * Handle player position update from the server OR WebRTC
     */
    private handlePlayerPositionUpdate(data: NetworkPlayerPosition): void {
        if (!data || !data.id || !data.position) {
            console.warn('[NetworkPlayerManager] Invalid position update:', data);
            return;
        }

        // Validate position data
        const pos = data.position;
        if (!isFinite(pos.x) || !isFinite(pos.y) || !isFinite(pos.z)) {
            console.warn('[NetworkPlayerManager] Invalid position values:', pos);
            return;
        }

        // Get or create the remote player
        const remotePlayer = this.getOrCreateRemotePlayer(data.id, data.position);

        // Update position
        const position = new Vector3(pos.x, pos.y, pos.z);
        remotePlayer.setTargetPosition(position);

        // Update rotation if available
        if (data.rotation) {
            const rot = data.rotation;
            if (isFinite(rot.x) && isFinite(rot.y) && isFinite(rot.z) && isFinite(rot.w)) {
                remotePlayer.setTargetRotation(rot.x, rot.y, rot.z, rot.w);
            }
        }
    }

    /**
     * Handle initial player positions received from the server
     */
    private handleInitialPlayerPositions(data: { players: NetworkPlayerPosition[] }): void {
        if (!data || !data.players || !Array.isArray(data.players)) {
            console.warn('[NetworkPlayerManager] Invalid initial player positions:', data);
            return;
        }

        console.log(`[NetworkPlayerManager] Received initial positions for ${data.players.length} players`);

        // Create remote players for each player in the list
        data.players.forEach(playerData => {
            if (playerData.id && playerData.position) {
                const remotePlayer = this.getOrCreateRemotePlayer(playerData.id, playerData.position);

                const position = new Vector3(
                    playerData.position.x,
                    playerData.position.y,
                    playerData.position.z
                );
                remotePlayer.setTargetPosition(position);

                if (playerData.rotation) {
                    const rot = playerData.rotation;
                    remotePlayer.setTargetRotation(rot.x, rot.y, rot.z, rot.w);
                }
            }
        });
    }

    /**
     * Handle player disconnection event
     */
    private handlePlayerDisconnected(data: { playerId: string }): void {
        if (!data || !data.playerId) {
            console.warn('[NetworkPlayerManager] Invalid player disconnection:', data);
            return;
        }

        const playerId = data.playerId;
        const remotePlayer = this.remotePlayers.get(playerId);

        if (remotePlayer) {
            console.log(`[NetworkPlayerManager] Player ${playerId} disconnected, removing from game`);

            // Dispose the entity
            remotePlayer.dispose();

            // Remove from our map
            this.remotePlayers.delete(playerId);
        }
    }

    /**
     * Handle connection state changes
     */
    private handleConnectionStateChange(data: { state: string }): void {
        const currentState = data.state;
        console.log(`[NetworkPlayerManager] Connection state: ${currentState}`);

        // If disconnected, clean up all remote players
        if (currentState === 'DISCONNECTED' || currentState === 'CONNECTION_ERROR') {
            console.log('[NetworkPlayerManager] Disconnected, cleaning up all remote players');
            this.cleanupAllRemotePlayers();
        }
    }

    /**
     * Get or create a remote player for the given ID
     */
    private getOrCreateRemotePlayer(
        playerId: string,
        position: { x: number; y: number; z: number }
    ): RemotePlayer {
        // Check if we already have this player
        let remotePlayer = this.remotePlayers.get(playerId);

        if (!remotePlayer) {
            if (!this.scene) {
                throw new Error('[NetworkPlayerManager] Scene not initialized');
            }

            console.log(`[NetworkPlayerManager] Creating new remote player: ${playerId}`);

            // Create position vector
            const playerPosition = new Vector3(position.x, position.y, position.z);

            // Create new remote player
            remotePlayer = new RemotePlayer(this.scene, playerId, playerPosition);

            // Store in our map
            this.remotePlayers.set(playerId, remotePlayer);
        }

        return remotePlayer;
    }

    /**
     * Clean up all remote players
     */
    private cleanupAllRemotePlayers(): void {
        this.remotePlayers.forEach((player, id) => {
            console.log(`[NetworkPlayerManager] Removing remote player: ${id}`);
            player.dispose();
        });

        this.remotePlayers.clear();
    }

    /**
     * Get all current remote players
     */
    public getAllRemotePlayers(): Map<string, RemotePlayer> {
        return this.remotePlayers;
    }

    /**
     * Get a specific remote player by ID
     */
    public getRemotePlayer(playerId: string): RemotePlayer | undefined {
        return this.remotePlayers.get(playerId);
    }

    /**
     * Update all remote players (called from game loop)
     */
    public update(deltaTime: number): void {
        this.remotePlayers.forEach(player => {
            player.onUpdate(deltaTime);
        });
    }
}
