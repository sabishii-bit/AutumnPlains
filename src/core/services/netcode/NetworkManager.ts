import { NetClient } from './NetClient';

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
        
        // Connect to server
        return this.netClient.connect(serverUrl)
            .then(() => {
                console.log(`Connected to ${environment} game server`);
            })
            .catch(error => {
                console.error(`Failed to connect to ${environment} server:`, error);
                throw error; // Re-throw to allow caller to handle
            });
    }
    
    /**
     * Disconnect from the server
     */
    public disconnectFromServer(): void {
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
} 