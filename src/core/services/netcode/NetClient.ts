import { io, Socket } from 'socket.io-client';

/**
 * NetClient - Basic network client for game communication
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
                
                // Connect to the server
                this.socket = io(url);
                
                // Resolve when connected
                this.socket.on('connect', () => {
                    this.connected = true;
                    this.reconnecting = false;
                    this.reconnectAttempts = 0;
                    console.log('Connected to server successfully');
                    resolve();
                });
                
                // Reject if connection error
                this.socket.on('connect_error', (error: Error) => {
                    console.error('Connection error:', error);
                    if (!this.reconnecting) {
                        reject(error);
                    }
                });
                
                // Handle disconnection
                this.socket.on('disconnect', (reason: string) => {
                    this.connected = false;
                    console.log(`Disconnected from server: ${reason}`);
                    
                    // Don't attempt to reconnect if we initiated the disconnect
                    // or if auto reconnect is disabled
                    if (reason === 'io client disconnect' || !this.shouldAutoReconnect) {
                        console.log('Client initiated disconnect - not attempting to reconnect');
                        return;
                    }
                    
                    // Attempt to reconnect
                    this.attemptReconnect();
                });
            } catch (error) {
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
        this.attemptReconnect();
    }
    
    /**
     * Disconnect from the server
     */
    public disconnect(): void {
        if (this.socket) {
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
