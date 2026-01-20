import { NetClient } from './NetClient';
import { PlayerSynchronizer } from './PlayerSynchronizer';
import type { PlayerCharacter } from '../entities/characters/PlayerCharacter';

/**
 * Server environment enum
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

    // Server configuration
    private serverConfig = {
        [ServerEnvironment.DEVELOPMENT]: 'ws://localhost:4733',
        [ServerEnvironment.PRODUCTION]: 'wss://ws.nullptr.fail'
    };

    private constructor() {
        this.netClient = NetClient.getInstance();
        this.playerSynchronizer = PlayerSynchronizer.getInstance();
    }

    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    /**
     * Determine server environment based on hostname
     */
    private getServerEnvironment(): ServerEnvironment {
        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';

        // Check for env parameter
        const urlParams = new URLSearchParams(window.location.search);
        const forceProduction = urlParams.get('env') === 'production';

        if (isLocalhost && !forceProduction) {
            return ServerEnvironment.DEVELOPMENT;
        }

        return ServerEnvironment.PRODUCTION;
    }

    /**
     * Connect to the game server
     */
    public connectToServer(): Promise<void> {
        const environment = this.getServerEnvironment();
        const serverUrl = this.serverConfig[environment];

        console.log(`[NetworkManager] Connecting to ${environment} server: ${serverUrl}`);

        // Disconnect if already connected
        if (this.netClient.isConnected()) {
            console.log('[NetworkManager] Already connected, disconnecting first');
            this.disconnectFromServer();
        }

        return this.netClient.connect(serverUrl)
            .then(() => {
                console.log(`[NetworkManager] Connected to ${environment} server`);

                // Start player synchronization if initialized
                if (this.playerSynchronizer) {
                    this.playerSynchronizer.startSyncInterval();
                }
            })
            .catch(error => {
                console.error(`[NetworkManager] Failed to connect to ${environment} server:`, error);
                throw error;
            });
    }

    /**
     * Initialize player synchronization
     */
    public initializePlayerSync(player: PlayerCharacter): void {
        if (!player) {
            console.error('[NetworkManager] Cannot initialize player sync: player is null');
            return;
        }

        console.log('[NetworkManager] Initializing player synchronization');
        this.playerSynchronizer.initialize(player);
    }

    /**
     * Disconnect from server
     */
    public disconnectFromServer(): void {
        this.playerSynchronizer.stopSyncInterval();
        this.netClient.disconnect();
        console.log('[NetworkManager] Disconnected from server');
    }

    /**
     * Toggle connection
     */
    public toggleConnection(): void {
        if (this.netClient.isConnected()) {
            this.disconnectFromServer();
        } else {
            this.connectToServer();
        }
    }

    /**
     * Get NetClient instance
     */
    public getNetClient(): NetClient {
        return this.netClient;
    }

    /**
     * Get current ping
     */
    public getCurrentPing(): number {
        return this.netClient.getCurrentPing();
    }

    /**
     * Send a chat message to the server
     * @param message The message to send
     * @returns true if message was sent successfully
     */
    public sendChatMessage(message: string): boolean {
        if (!this.netClient.isConnected()) {
            console.warn('[NetworkManager] Cannot send chat message: not connected to server');
            return false;
        }

        try {
            // Send chat message in the format the server expects
            this.netClient.send('chat_message', { message });
            console.log('[NetworkManager] Chat message sent:', message);
            return true;
        } catch (error) {
            console.error('[NetworkManager] Failed to send chat message:', error);
            return false;
        }
    }
}
