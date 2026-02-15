import { WebRTCPeer } from './WebRTCPeer';
import { NetClient } from './NetClient';
import type SimplePeer from 'simple-peer';

/**
 * WebRTCManager - Manages WebRTC peer-to-peer connections with other players
 * Handles connection setup via WebSocket signaling and manages active peer connections
 */
export class WebRTCManager {
    private static instance: WebRTCManager;
    private netClient: NetClient;
    private peers: Map<string, WebRTCPeer> = new Map();
    private onPlayerDataCallback: ((playerId: string, data: any) => void) | null = null;
    private isInitialized: boolean = false;

    private constructor() {
        this.netClient = NetClient.getInstance();
    }

    public static getInstance(): WebRTCManager {
        if (!WebRTCManager.instance) {
            WebRTCManager.instance = new WebRTCManager();
        }
        return WebRTCManager.instance;
    }

    /**
     * Initialize WebRTC manager and set up signaling listeners
     */
    public initialize(): void {
        if (this.isInitialized) {
            console.warn('[WebRTCManager] Already initialized');
            return;
        }

        // Listen for player list (initial players to connect to)
        document.addEventListener('socket_player_list', (event: any) => {
            this.handlePlayerList(event.detail);
        });

        // Listen for new player joining (initiate connection)
        document.addEventListener('socket_player_joined', (event: any) => {
            this.handlePlayerJoined(event.detail);
        });

        // Listen for WebRTC signals from other players
        document.addEventListener('socket_webrtc_signal', (event: any) => {
            this.handleWebRTCSignal(event.detail);
        });

        // Listen for player disconnection
        document.addEventListener('socket_player_disconnected', (event: any) => {
            this.handlePlayerDisconnected(event.detail);
        });

        this.isInitialized = true;
        console.log('[WebRTCManager] Initialized');
    }

    /**
     * Handle initial player list from server
     */
    private handlePlayerList(data: { playerIds: string[] }): void {
        if (!data || !Array.isArray(data.playerIds)) {
            console.warn('[WebRTCManager] Invalid player list:', data);
            return;
        }

        console.log(`[WebRTCManager] Received player list: ${data.playerIds.length} players`);

        // Connect to each existing player (we are the initiator)
        data.playerIds.forEach(playerId => {
            this.connectToPeer(playerId, true);
        });
    }

    /**
     * Handle new player joining (we initiate the connection)
     */
    private handlePlayerJoined(data: { playerId: string }): void {
        if (!data || !data.playerId) {
            console.warn('[WebRTCManager] Invalid player_joined:', data);
            return;
        }

        console.log(`[WebRTCManager] New player joined: ${data.playerId}`);

        // Connect to the new player (we are NOT the initiator - they will initiate)
        // We'll wait for their signal
    }

    /**
     * Handle WebRTC signal from another player
     */
    private handleWebRTCSignal(data: { fromId: string; signal: SimplePeer.SignalData }): void {
        if (!data || !data.fromId || !data.signal) {
            console.warn('[WebRTCManager] Invalid WebRTC signal:', data);
            return;
        }

        console.log(`[WebRTCManager] Received signal from ${data.fromId}`);

        let peer = this.peers.get(data.fromId);

        // If we don't have a peer yet, create one (they initiated)
        if (!peer) {
            peer = this.connectToPeer(data.fromId, false);
        }

        // Process the signal
        peer.signal(data.signal);
    }

    /**
     * Handle player disconnection
     */
    private handlePlayerDisconnected(data: { playerId: string }): void {
        if (!data || !data.playerId) {
            return;
        }

        console.log(`[WebRTCManager] Player disconnected: ${data.playerId}`);
        this.disconnectPeer(data.playerId);
    }

    /**
     * Connect to a peer
     */
    private connectToPeer(peerId: string, initiator: boolean): WebRTCPeer {
        // Check if already connected
        if (this.peers.has(peerId)) {
            console.warn(`[WebRTCManager] Already have connection to ${peerId}`);
            return this.peers.get(peerId)!;
        }

        console.log(`[WebRTCManager] Connecting to peer ${peerId}, initiator: ${initiator}`);

        // Create peer connection
        const peer = new WebRTCPeer(peerId, initiator, (signal) => {
            // Send signal to server to relay to target peer
            this.netClient.send('webrtc_signal', {
                targetId: peerId,
                signal
            });
        });

        // Set up data handler
        peer.onData((data) => {
            if (this.onPlayerDataCallback) {
                this.onPlayerDataCallback(peerId, data);
            }
        });

        // Set up close handler
        peer.onClose(() => {
            this.peers.delete(peerId);
            console.log(`[WebRTCManager] Peer connection closed: ${peerId}`);
        });

        this.peers.set(peerId, peer);
        return peer;
    }

    /**
     * Disconnect from a peer
     */
    private disconnectPeer(peerId: string): void {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.destroy();
            this.peers.delete(peerId);
        }
    }

    /**
     * Send data to a specific peer
     */
    public sendToPeer(peerId: string, data: any): void {
        const peer = this.peers.get(peerId);
        if (peer && peer.isConnected()) {
            peer.send(data);
        }
    }

    /**
     * Broadcast data to all connected peers
     */
    public broadcast(data: any): void {
        this.peers.forEach(peer => {
            if (peer.isConnected()) {
                peer.send(data);
            }
        });
    }

    /**
     * Set callback for incoming player data
     */
    public onPlayerData(callback: (playerId: string, data: any) => void): void {
        this.onPlayerDataCallback = callback;
    }

    /**
     * Get all connected peer IDs
     */
    public getConnectedPeers(): string[] {
        const connected: string[] = [];
        this.peers.forEach((peer, id) => {
            if (peer.isConnected()) {
                connected.push(id);
            }
        });
        return connected;
    }

    /**
     * Check if connected to a specific peer
     */
    public isConnectedToPeer(peerId: string): boolean {
        const peer = this.peers.get(peerId);
        return peer ? peer.isConnected() : false;
    }

    /**
     * Disconnect all peers
     */
    public disconnectAll(): void {
        this.peers.forEach(peer => peer.destroy());
        this.peers.clear();
    }
}
