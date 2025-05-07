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
 * Detailed error information for connection issues
 */
export interface ConnectionError {
    type: 'timeout' | 'websocket' | 'network' | 'server' | 'unknown';
    message: string;
    code?: number;
    timestamp: number;
}

/**
 * NetClient - Basic network client for game communication
 * 
 * Example usage:
 * ```
 * const client = NetClient.getInstance();
 * client.connect('ws://localhost:4733');
 * client.send('player_update', { position: { x: 10, y: 0, z: 5 } });
 * ```
 */
export class NetClient {
    private static instance: NetClient;
    private socket: WebSocket | null = null;
    private connected: boolean = false;
    private serverUrl: string = '';
    private reconnecting: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5; // Maximum number of reconnect attempts
    private reconnectDelay: number = 2000; // ms
    private shouldAutoReconnect: boolean = true;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private disconnectReason: string = '';
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private lastError: ConnectionError | null = null;
    private errorHistory: ConnectionError[] = [];
    private readonly maxErrorHistory = 5;
    private visibilityChangeHandler: (() => void) | null = null;
    private wakeLock: WakeLockSentinel | null = null;
    private lastActivityTimestamp: number = Date.now();
    private readonly activityTimeout = 30000; // 30 seconds
    private activityCheckInterval: NodeJS.Timeout | null = null;
    private clientId: string = '';
    private clientIp: string = '';
    private isLocalConnection: boolean = false;
    private publicIp: string = '';
    private connectionTimestamp: number = 0;
    
    /**
     * Private constructor - use getInstance() instead
     */
    private constructor() {
        this.setupVisibilityHandling();
        this.setupActivityMonitoring();
    }
    
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
                
                // Clean up any existing connection
                this.cleanupConnection();
                
                // Connect to the server
                this.socket = new WebSocket(url);
                
                // Set a connection timeout
                const connectionTimeout = setTimeout(() => {
                    if (!this.connected) {
                        this.handleConnectionFailure({
                            type: 'timeout',
                            message: 'Connection attempt timed out after 10 seconds',
                            timestamp: Date.now()
                        });
                        reject(new Error('Connection timeout'));
                    }
                }, 10000); // 10 second timeout
                
                // Resolve when connected
                this.socket.onopen = () => {
                    clearTimeout(connectionTimeout);
                    this.connected = true;
                    this.reconnecting = false;
                    this.reconnectAttempts = 0;
                    this.connectionState = ConnectionState.CONNECTED;
                    this.lastError = null; // Clear any previous errors
                    this.lastActivityTimestamp = Date.now(); // Reset activity timestamp
                    console.log('Connected to server successfully');
                    resolve();
                };
                
                // Reject if connection error
                this.socket.onerror = (event) => {
                    clearTimeout(connectionTimeout);
                    console.error('Connection error:', event);
                    this.handleConnectionFailure({
                        type: 'websocket',
                        message: 'WebSocket connection error',
                        timestamp: Date.now()
                    });
                    if (!this.reconnecting) {
                        reject(new Error('WebSocket connection error'));
                    }
                };
                
                // Handle disconnection
                this.socket.onclose = (event) => {
                    clearTimeout(connectionTimeout);
                    this.connected = false;
                    this.disconnectReason = event.reason || `Code: ${event.code}`;
                    
                    // Create error object for disconnection
                    const error: ConnectionError = {
                        type: 'server',
                        message: event.reason || 'Server closed connection',
                        code: event.code,
                        timestamp: Date.now()
                    };
                    
                    // Handle specific close codes
                    switch (event.code) {
                        case 1000:
                            error.type = 'server';
                            error.message = 'Normal closure';
                            break;
                        case 1001:
                            error.type = 'server';
                            error.message = 'Server going away';
                            break;
                        case 1002:
                            error.type = 'network';
                            error.message = 'Protocol error';
                            break;
                        case 1003:
                            error.type = 'network';
                            error.message = 'Unsupported data';
                            break;
                        case 1005:
                            error.type = 'network';
                            error.message = 'No status received';
                            break;
                        case 1006:
                            error.type = 'network';
                            error.message = 'Abnormal closure';
                            break;
                        case 1007:
                            error.type = 'network';
                            error.message = 'Invalid frame payload data';
                            break;
                        case 1008:
                            error.type = 'server';
                            error.message = 'Policy violation';
                            break;
                        case 1009:
                            error.type = 'network';
                            error.message = 'Message too big';
                            break;
                        case 1010:
                            error.type = 'server';
                            error.message = 'Missing extension';
                            break;
                        case 1011:
                            error.type = 'server';
                            error.message = 'Internal server error';
                            break;
                        case 1012:
                            error.type = 'server';
                            error.message = 'Service restart';
                            break;
                        case 1013:
                            error.type = 'server';
                            error.message = 'Try again later';
                            break;
                        case 1014:
                            error.type = 'server';
                            error.message = 'Bad gateway';
                            break;
                        case 1015:
                            error.type = 'network';
                            error.message = 'TLS handshake failed';
                            break;
                    }
                    
                    this.handleConnectionFailure(error);
                    console.log(`Disconnected from server: ${this.disconnectReason}`);
                    
                    // Don't attempt to reconnect if we initiated the disconnect
                    // or if auto reconnect is disabled
                    if (event.wasClean && !this.shouldAutoReconnect) {
                        this.connectionState = ConnectionState.DISCONNECTED_BY_CLIENT;
                        console.log('Client initiated disconnect - not attempting to reconnect');
                        return;
                    }
                    
                    // Attempt to reconnect
                    this.connectionState = ConnectionState.RECONNECTING;
                    this.attemptReconnect();
                };
                
                // Handle incoming messages
                this.socket.onmessage = this.handleSocketMessage.bind(this);
            } catch (error) {
                this.handleConnectionFailure({
                    type: 'unknown',
                    message: 'Failed to create WebSocket connection',
                    timestamp: Date.now()
                });
                reject(error);
            }
        });
    }
    
    /**
     * Handle connection failure and cleanup
     */
    private handleConnectionFailure(error: ConnectionError): void {
        this.connected = false;
        this.connectionState = ConnectionState.CONNECTION_ERROR;
        this.disconnectReason = error.message;
        this.lastError = error;
        
        // Add to error history
        this.errorHistory.unshift(error);
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory.pop();
        }
        
        this.cleanupConnection();
    }
    
    /**
     * Clean up existing connection
     */
    private cleanupConnection(): void {
        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onclose = null;
            this.socket.onerror = null;
            this.socket.onmessage = null;
            this.socket.close();
            this.socket = null;
        }
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Clear activity check interval
        if (this.activityCheckInterval) {
            clearInterval(this.activityCheckInterval);
            this.activityCheckInterval = null;
        }
    }
    
    /**
     * Attempt to reconnect to the server
     * Will continue trying until max attempts reached or connected
     */
    private attemptReconnect(): void {
        if (this.reconnecting) {
            console.log('Already attempting to reconnect...');
            return;
        }
        
        this.reconnecting = true;
        this.reconnectAttempts++;
        this.connectionState = ConnectionState.RECONNECTING;
        
        console.log(`Attempting to reconnect (attempt #${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        // Check if we've exceeded max attempts
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            this.connectionState = ConnectionState.CONNECTION_ERROR;
            this.reconnecting = false;
            return;
        }
        
        // Wait for the specified delay before attempting to reconnect
        this.reconnectTimeout = setTimeout(() => {
            if (this.connected) {
                console.log('Already reconnected');
                this.reconnecting = false;
                return;
            }
            
            console.log(`Reconnecting to ${this.serverUrl}...`);
            
            // Attempt to connect again
            this.connect(this.serverUrl)
                .then(() => {
                    console.log('Reconnected successfully');
                    this.reconnecting = false;
                })
                .catch(error => {
                    console.error('Reconnection failed:', error);
                    this.reconnecting = false;
                    // Continue the reconnection loop if we haven't hit max attempts
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.attemptReconnect();
                    } else {
                        this.connectionState = ConnectionState.CONNECTION_ERROR;
                    }
                });
        }, this.reconnectDelay);
    }
    
    /**
     * Get the last error that occurred
     * @returns The last connection error or null if no error
     */
    public getLastError(): ConnectionError | null {
        return this.lastError;
    }
    
    /**
     * Get the error history
     * @returns Array of recent connection errors
     */
    public getErrorHistory(): ConnectionError[] {
        return [...this.errorHistory];
    }
    
    /**
     * Get a formatted error message for display
     * @returns Formatted error message
     */
    public getFormattedErrorMessage(): string {
        if (!this.lastError) return '';
        
        const error = this.lastError;
        const time = new Date(error.timestamp).toLocaleTimeString();
        return `[${time}] ${error.type.toUpperCase()}: ${error.message}${error.code ? ` (Code: ${error.code})` : ''}`;
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
        this.connectionState = ConnectionState.DISCONNECTED_BY_CLIENT;
        this.cleanupConnection();
        this.connected = false;
        
        // Release wake lock
        if (this.wakeLock) {
            this.wakeLock.release()
                .then(() => {
                    console.log('Wake lock released');
                    this.wakeLock = null;
                })
                .catch(err => console.warn('Error releasing wake lock:', err));
        }

        // Remove visibility change handler
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = null;
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
        
        const message = JSON.stringify({
            event,
            data
        });
        
        this.socket.send(message);
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
    
    /**
     * Set the maximum number of reconnection attempts
     * @param attempts The maximum number of attempts
     */
    public setMaxReconnectAttempts(attempts: number): void {
        this.maxReconnectAttempts = attempts;
    }

    private setupVisibilityHandling(): void {
        // Handle tab visibility changes
        this.visibilityChangeHandler = () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab became visible, checking connection...');
                this.handleVisibilityChange();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);

        // Request wake lock to prevent device sleep
        this.requestWakeLock();
    }

    private async requestWakeLock(): Promise<void> {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake lock acquired');
            }
        } catch (err) {
            console.warn('Wake lock request failed:', err);
        }
    }

    private setupActivityMonitoring(): void {
        // Monitor user activity
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivityTimestamp = Date.now();
            });
        });

        // Check for inactivity
        this.activityCheckInterval = setInterval(() => {
            const now = Date.now();
            if (now - this.lastActivityTimestamp > this.activityTimeout) {
                console.log('User inactive, checking connection...');
                this.handleInactivity();
            }
        }, 5000); // Check every 5 seconds
    }

    private handleVisibilityChange(): void {
        if (!this.connected && this.shouldAutoReconnect) {
            console.log('Tab became visible, attempting to reconnect...');
            this.reconnectAttempts = 0; // Reset attempts for fresh start
            this.attemptReconnect();
        } else if (this.connected) {
            // Verify connection is still alive
            this.verifyConnection();
        }
    }

    private handleInactivity(): void {
        if (this.connected) {
            // If we've been inactive, verify the connection
            this.verifyConnection();
        }
    }

    private verifyConnection(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.log('Connection appears to be dead, attempting to reconnect...');
            this.handleConnectionFailure({
                type: 'network',
                message: 'Connection lost during inactivity',
                timestamp: Date.now()
            });
            this.attemptReconnect();
        }
    }

    /**
     * Socket message handler
     */
    private handleSocketMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data);
            
            // Handle connection confirmation
            if (message.event === 'connected') {
                this.clientId = message.data.id;
                this.clientIp = message.data.ip;
                this.isLocalConnection = message.data.isLocal;
                this.connectionTimestamp = message.data.timestamp;
                console.log(`Server confirmed connection - Client ID: ${this.clientId}, IP: ${this.clientIp}`);
                
                // If local connection, try to get public IP
                if (this.isLocalConnection) {
                    this.getPublicIp().then(ip => {
                        if (ip) {
                            this.publicIp = ip;
                            console.log(`Detected public IP: ${this.publicIp}`);
                            // Send public IP to server
                            this.send('client_info', { publicIp: this.publicIp });
                        }
                    });
                }
            }
            
            console.log('Received message:', message);
        } catch (error) {
            console.error('Error parsing message:', error);
            this.handleConnectionFailure({
                type: 'network',
                message: 'Failed to parse server message',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Get public IP address using a third-party service
     */
    private async getPublicIp(): Promise<string> {
        try {
            // Try multiple IP services for reliability
            const services = [
                'https://api.ipify.org?format=json',
                'https://api.ip.sb/jsonip',
                'https://api.myip.com'
            ];
            
            // Try each service until we get a response
            for (const service of services) {
                try {
                    const response = await fetch(service);
                    if (response.ok) {
                        const data = await response.json();
                        // Different services use different field names
                        return data.ip || data.ipAddress || '';
                    }
                } catch (e) {
                    console.warn(`Failed to get IP from ${service}:`, e);
                    // Continue to next service
                }
            }
            
            console.warn('Could not determine public IP from any service');
            return '';
        } catch (error) {
            console.error('Error getting public IP:', error);
            return '';
        }
    }

    /**
     * Get the client's assigned ID from the server
     */
    public getClientId(): string {
        return this.clientId;
    }

    /**
     * Get the client's IP address as seen by the server
     */
    public getClientIp(): string {
        // Return public IP if available, otherwise return the IP from the server
        return this.publicIp || this.clientIp;
    }

    /**
     * Check if this is a local connection
     */
    public isLocalIp(): boolean {
        return this.isLocalConnection;
    }

    /**
     * Get the client's public IP if detected
     */
    public getPublicClientIp(): string {
        return this.publicIp;
    }

    /**
     * Get the timestamp when the connection was established
     */
    public getConnectionTimestamp(): number {
        return this.connectionTimestamp;
    }
}
