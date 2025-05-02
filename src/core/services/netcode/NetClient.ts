import { io, Socket } from 'socket.io-client';

/**
 * Connection state enum for tracking detailed network status
 */
export enum ConnectionState {
    DISCONNECTED = 'Disconnected',
    CONNECTING = 'Connecting...',
    CONNECTED = 'Connected',
    RECONNECTING = 'Reconnecting...',
    CONNECTION_ERROR = 'Connection Error',
    DISCONNECTED_BY_SERVER = 'Disconnected by Server',
    DISCONNECTED_BY_CLIENT = 'Disconnected by Client'
}

/**
 * NetClient - Basic network client for game communication
 * 
 * Example usage:
 * ```
 * const client = NetClient.getInstance();
 * client.connect('http://localhost:3000');
 * client.send('player_update', { position: { x: 10, y: 0, z: 5 } });
 * ```
 */
export class NetClient {
    private static instance: NetClient;
    private socket: Socket | null = null;
    private connected: boolean = false;
    private serverUrl: string = '';
    private reconnecting: boolean = false;
    private reconnectAttempts: number = 0;
    private reconnectDelay: number = 2000; // ms
    private shouldAutoReconnect: boolean = true;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private disconnectReason: string = '';
    
    /**
     * Private constructor - use getInstance() instead
     */
    private constructor() {}
    
    /**
     * Get the singleton instance of NetClient
     */
    public static getInstance(): NetClient {
        if (!NetClient.instance) {
            NetClient.instance = new NetClient();
        }
        return NetClient.instance;
    }
    
    /**
     * Connect to the server
     * @param url The server URL to connect to
     * @returns Promise that resolves when connected
     */
    public connect(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.serverUrl = url;
                console.log(`Connecting to server: ${url}`);
                this.connectionState = ConnectionState.CONNECTING;
                
                // Connect to the server
                this.socket = io(url);
                
                // Resolve when connected
                this.socket.on('connect', () => {
                    this.connected = true;
                    this.reconnecting = false;
                    this.reconnectAttempts = 0;
                    this.connectionState = ConnectionState.CONNECTED;
                    console.log('Connected to server successfully');
                    resolve();
                });
                
                // Reject if connection error
                this.socket.on('connect_error', (error: Error) => {
                    console.error('Connection error:', error);
                    this.connectionState = ConnectionState.CONNECTION_ERROR;
                    if (!this.reconnecting) {
                        reject(error);
                    }
                });
                
                // Handle disconnection
                this.socket.on('disconnect', (reason: string) => {
                    this.connected = false;
                    this.disconnectReason = reason;
                    console.log(`Disconnected from server: ${reason}`);
                    
                    // Don't attempt to reconnect if we initiated the disconnect
                    // or if auto reconnect is disabled
                    if (reason === 'io client disconnect' || !this.shouldAutoReconnect) {
                        this.connectionState = reason === 'io client disconnect' 
                            ? ConnectionState.DISCONNECTED_BY_CLIENT 
                            : ConnectionState.DISCONNECTED_BY_SERVER;
                        console.log('Client initiated disconnect - not attempting to reconnect');
                        return;
                    }
                    
                    // Attempt to reconnect
                    this.connectionState = ConnectionState.RECONNECTING;
                    this.attemptReconnect();
                });
            } catch (error) {
                this.connectionState = ConnectionState.CONNECTION_ERROR;
                reject(error);
            }
        });
    }
    
    /**
     * Attempt to reconnect to the server
     * Will continue trying indefinitely until connected or manually stopped
     */
    private attemptReconnect(): void {
        if (this.reconnecting) {
            console.log('Already attempting to reconnect...');
            return;
        }
        
        this.reconnecting = true;
        this.reconnectAttempts++;
        this.connectionState = ConnectionState.RECONNECTING;
        
        console.log(`Attempting to reconnect (attempt #${this.reconnectAttempts})...`);
        
        // Wait for the specified delay before attempting to reconnect
        setTimeout(() => {
            if (this.connected) {
                console.log('Already reconnected');
                this.reconnecting = false;
                return;
            }
            
            console.log(`Reconnecting to ${this.serverUrl}...`);
            
            // Close existing socket if it exists
            if (this.socket) {
                this.socket.close();
            }
            
            // Attempt to connect again
            this.connect(this.serverUrl)
                .then(() => {
                    console.log('Reconnected successfully');
                    this.reconnecting = false;
                })
                .catch(error => {
                    console.error('Reconnection failed:', error);
                    // Continue the reconnection loop indefinitely
                    this.attemptReconnect();
                });
        }, this.reconnectDelay);
    }
    
    /**
     * Manually trigger a reconnection attempt
     * This can be called if auto-reconnect is disabled
     */
    public reconnect(): void {
        if (this.connected) {
            console.warn('Already connected to server');
            return;
        }
        
        this.reconnectAttempts = 0; // Reset the counter for manual reconnect
        this.connectionState = ConnectionState.RECONNECTING;
        this.attemptReconnect();
    }
    
    /**
     * Disconnect from the server
     */
    public disconnect(): void {
        if (this.socket) {
            this.connectionState = ConnectionState.DISCONNECTED_BY_CLIENT;
            this.socket.disconnect();
            this.connected = false;
        }
    }
    
    /**
     * Check if client is connected to the server
     * @returns Whether the client is connected
     */
    public isConnected(): boolean {
        return this.connected;
    }
    
    /**
     * Get the current connection state
     * @returns The current connection state
     */
    public getConnectionState(): ConnectionState {
        return this.connectionState;
    }
    
    /**
     * Get the reason for the last disconnection
     * @returns The reason for the last disconnection
     */
    public getDisconnectReason(): string {
        return this.disconnectReason;
    }
    
    /**
     * Get the number of reconnection attempts
     * @returns The number of reconnection attempts
     */
    public getReconnectAttempts(): number {
        return this.reconnectAttempts;
    }
    
    /**
     * Send a simple message to the server
     * @param event The event name
     * @param data The data to send
     */
    public send(event: string, data: any): void {
        if (!this.socket || !this.connected) {
            console.warn('Cannot send message: not connected to server');
            return;
        }
        
        this.socket.emit(event, data);
    }
    
    /**
     * Enable or disable auto-reconnection
     * @param enable Whether to enable auto-reconnection
     */
    public setAutoReconnect(enable: boolean): void {
        this.shouldAutoReconnect = enable;
    }
    
    /**
     * Set the delay between reconnection attempts
     * @param delay The delay in milliseconds
     */
    public setReconnectDelay(delay: number): void {
        this.reconnectDelay = delay;
    }
}
