import { NetClient } from './NetClient';
import { PlayerSynchronizer } from './PlayerSynchronizer';
import { NetworkObjectManager } from './NetworkObjectManager';
import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';

/**
 * Environment configuration for server connection
 */
export enum ServerEnvironment {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production'
}

/**
 * NetworkManager - Manages server connections and environment configuration
 */
export class NetworkManager {
    private static instance: NetworkManager;
    private netClient: NetClient;
    private playerSynchronizer: PlayerSynchronizer;
    private networkObjectManager: NetworkObjectManager;
    
    // Server connection configuration
    private serverConfig = {
        [ServerEnvironment.DEVELOPMENT]: 'ws://localhost:4733',
        [ServerEnvironment.PRODUCTION]: 'wss://ws.nullptr.fail'
    };
    
    /**
     * Private constructor - use getInstance() instead
     */
    private constructor() {
        this.netClient = NetClient.getInstance();
        this.playerSynchronizer = PlayerSynchronizer.getInstance();
        this.networkObjectManager = NetworkObjectManager.getInstance();
    }
    
    /**
     * Get the singleton instance of NetworkManager
     */
    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }
    
    /**
     * Determine which server environment to use
     * In a real app, this could check for environment variables, build flags, etc.
     */
    private getServerEnvironment(): ServerEnvironment {
        // For development purposes, check if we're running on localhost
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
        
        // Check if we have a special URL param for forcing production
        const urlParams = new URLSearchParams(window.location.search);
        const forceProduction = urlParams.get('env') === 'production';
        
        // Use development for localhost unless forced to production
        if (isLocalhost && !forceProduction) {
            return ServerEnvironment.DEVELOPMENT;
        }
        
        // Default to production for all other cases
        return ServerEnvironment.PRODUCTION;
    }
    
    /**
     * Connect to the game server
     * @returns Promise that resolves when connected
     */
    public connectToServer(): Promise<void> {
        // Determine environment
        const environment = this.getServerEnvironment();
        const serverUrl = this.serverConfig[environment];
        
        console.log(`Connecting to ${environment} server at: ${serverUrl}`);
        
        // Initialize network object manager if not already initialized
        if (!this.networkObjectManager) {
            this.networkObjectManager = NetworkObjectManager.getInstance();
        }
        this.networkObjectManager.initialize();
        
        // If we're already connected, disconnect first
        if (this.netClient.isConnected()) {
            console.log('Already connected to server, disconnecting first...');
            this.disconnectFromServer();
        }
        
        // Connect to server
        return this.netClient.connect(serverUrl)
            .then(() => {
                console.log(`Connected to ${environment} game server`);
                
                // If we have a player synchronizer, ensure it's running
                if (this.playerSynchronizer) {
                    this.playerSynchronizer.startSyncInterval();
                }
            })
            .catch(error => {
                console.error(`Failed to connect to ${environment} server:`, error);
                throw error; // Re-throw to allow caller to handle
            });
    }
    
    /**
     * Initialize the player for network synchronization
     * @param player The local player character instance
     */
    public initializePlayerSync(player: PlayerCharacter): void {
        if (!player) {
            console.error('Cannot initialize player sync: player is null');
            return;
        }
        
        console.log('Initializing player network synchronization');
        this.playerSynchronizer.initialize(player);
    }
    
    /**
     * Disconnect from the server
     */
    public disconnectFromServer(): void {
        // Stop player synchronization
        this.playerSynchronizer.stopSyncInterval();
        
        // Disconnect from server
        this.netClient.disconnect();
        console.log("Disconnected from server");
    }
    
    /**
     * Toggle server connection (connect if disconnected, disconnect if connected)
     */
    public toggleConnection(): void {
        if (this.netClient.isConnected()) {
            console.log("Manually disconnecting from server");
            this.disconnectFromServer();
        } else {
            console.log("Manually connecting to server");
            this.connectToServer();
        }
    }
    
    /**
     * Set the server URL for a specific environment
     * @param environment The environment to configure
     * @param url The server URL
     */
    public setServerUrl(environment: ServerEnvironment, url: string): void {
        this.serverConfig[environment] = url;
    }
    
    /**
     * Get the server URL for a specific environment
     * @param environment The environment to get the URL for
     * @returns The server URL
     */
    public getServerUrl(environment: ServerEnvironment): string {
        return this.serverConfig[environment];
    }

    /**
     * Get the client's assigned ID from the server
     * @returns The client ID or empty string if not connected
     */
    public getClientId(): string {
        return this.netClient.getClientId();
    }

    /**
     * Get the client's IP address as seen by the server
     * @returns The client IP or empty string if not connected
     */
    public getClientIp(): string {
        return this.netClient.getClientIp();
    }

    /**
     * Get the timestamp when the connection was established
     * @returns The connection timestamp or 0 if not connected
     */
    public getConnectionTimestamp(): number {
        return this.netClient.getConnectionTimestamp();
    }

    /**
     * Get formatted connection information
     * @returns Object containing connection details
     */
    public getConnectionInfo(): { 
        id: string; 
        ip: string; 
        connectedAt: string;
        environment: ServerEnvironment;
    } {
        const timestamp = this.getConnectionTimestamp();
        return {
            id: this.getClientId(),
            ip: this.getClientIp(),
            connectedAt: timestamp ? new Date(timestamp).toLocaleString() : 'Not connected',
            environment: this.getServerEnvironment()
        };
    }
    
    /**
     * Send a chat message to the server
     * @param message The message text to send
     * @returns boolean indicating if the message was sent
     */
    public sendChatMessage(message: string): boolean {
        if (!this.netClient.isConnected()) {
            console.warn('Cannot send chat message: not connected to server');
            return false;
        }
        
        if (!message || message.trim() === '') {
            console.warn('Cannot send empty chat message');
            return false;
        }
        
        this.netClient.send('chat_message', {
            message: message.trim(),
            timestamp: Date.now()
        });
        
        return true;
    }
    
    /**
     * Set the player synchronization interval
     * @param intervalMs The interval in milliseconds
     */
    public setPlayerSyncInterval(intervalMs: number): void {
        this.playerSynchronizer.setSyncInterval(intervalMs);
    }
    
    /**
     * Set the position change threshold for player synchronization
     * @param threshold The position threshold in units
     */
    public setPositionSyncThreshold(threshold: number): void {
        this.playerSynchronizer.setPositionThreshold(threshold);
    }
    
    /**
     * Set the network player position interpolation factor
     * @param factor The interpolation factor (0-1)
     */
    public setNetworkPlayerInterpolation(factor: number): void {
        this.networkObjectManager.setInterpolationFactor(factor);
    }
    
    /**
     * Get player synchronizer instance
     * @returns PlayerSynchronizer instance
     */
    public getPlayerSynchronizer(): PlayerSynchronizer {
        return this.playerSynchronizer;
    }
    
    /**
     * Get all network players currently in the game
     * @returns Map of network player instances by ID
     */
    public getNetworkPlayers() {
        return this.networkObjectManager.getAllNetworkPlayers();
    }

    /**
     * Get the current ping to the server in milliseconds
     * @returns The current ping or 0 if not connected
     */
    public getCurrentPing(): number {
        return this.netClient.getCurrentPing();
    }
} 