import { DeviceDetectionService } from '../device/DeviceDetectionService';

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
    private deviceDetectionService: DeviceDetectionService;
    private mobileReconnectTimeout: NodeJS.Timeout | null = null;
    private pageShowHandler: (() => void) | null = null;
    private onlineHandler: (() => void) | null = null;
    private offlineHandler: (() => void) | null = null;
    private focusHandler: (() => void) | null = null;
    private blurHandler: (() => void) | null = null;
    private isMobileDevice: boolean = false;
    private persistentReconnectInterval: NodeJS.Timeout | null = null;
    private readonly mobilePersistentReconnectDelay = 10000; // 10 seconds
    private lastActiveTime: number = Date.now();
    private resumeHandler: (() => void) | null = null;
    private pingInterval: number | null = null;
    private lastPingTime: number = 0;
    private currentPing: number = -1; // Initialize to -1 to indicate no ping yet
    private readonly pingIntervalMs = 1000; // Send ping every second
    private pingTimeouts: Map<number, number> = new Map(); // Map of ping sequence to timeout ID
    
    /**
     * Private constructor - use getInstance() instead
     */
    private constructor() {
        this.deviceDetectionService = DeviceDetectionService.getInstance();
        this.isMobileDevice = this.deviceDetectionService.isMobile();
        this.setupVisibilityHandling();
        this.setupActivityMonitoring();
        this.setupMobileEventHandlers();
        
        // For mobile devices, set up persistent reconnection
        if (this.isMobileDevice) {
            this.setupPersistentReconnection();
        }
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
                    
                    // Start ping interval when connected
                    this.startPingInterval();
                    
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
        
        // On mobile, don't clean up completely - we want to retry later
        if (this.isMobileDevice) {
            // Clean up the socket but don't stop the persistent reconnection
            this.cleanupSocketOnly();
        } else {
            // On desktop, perform normal cleanup
            this.cleanupConnection();
        }
    }
    
    /**
     * Clean up socket connection only, preserving reconnection mechanisms
     */
    private cleanupSocketOnly(): void {
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
    }
    
    /**
     * Clean up connection and all intervals
     */
    private cleanupConnection(): void {
        this.cleanupSocketOnly();

        // Clear activity check interval
        if (this.activityCheckInterval) {
            clearInterval(this.activityCheckInterval);
            this.activityCheckInterval = null;
        }

        if (this.mobileReconnectTimeout) {
            clearTimeout(this.mobileReconnectTimeout);
            this.mobileReconnectTimeout = null;
        }
        
        // Clear persistent reconnect interval
        if (this.persistentReconnectInterval) {
            clearInterval(this.persistentReconnectInterval);
            this.persistentReconnectInterval = null;
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
        this.stopPingInterval(); // Stop ping interval when disconnecting
        this.cleanupConnection();
        this.cleanupEventHandlers();
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
        const previousState = this.connectionState;
        
        // If state changes, dispatch an event
        if (this.connectionState !== previousState) {
            document.dispatchEvent(new CustomEvent('socket_connection_state_change', {
                detail: {
                    previousState: previousState,
                    state: this.connectionState
                }
            }));
        }
        
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
        
        // Special logging for position messages to debug syncing
        if (event === 'player_position') {
            console.log(`Sending player_position message to server:`, data);
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

    /**
     * Set up visibility handling for connection management
     */
    private setupVisibilityHandling(): void {
        // Clean up any existing handler
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = null;
        }
        
        this.visibilityChangeHandler = () => {
            this.handleVisibilityChange();
        };
        
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
        
        // Note: We don't need an additional event listener as we've incorporated
        // the connection state dispatch into handleVisibilityChange
        
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

    /**
     * Handle visibility change
     */
    private handleVisibilityChange(): void {
        if (document.visibilityState === 'visible') {
            // For mobile devices, use the more specialized handler
            if (this.isMobileDevice) {
                this.handleMobileResume();
            } else {
                // Original desktop behavior
                if (!this.connected && this.shouldAutoReconnect) {
                    console.log('Tab became visible, attempting to reconnect...');
                    this.reconnectAttempts = 0;
                    this.attemptReconnect();
                } else if (this.connected) {
                    this.verifyConnection();
                }
            }
            
            // Dispatch connection state change
            this.dispatchConnectionStateChange();
            
            // Update last activity timestamp
            this.lastActivityTimestamp = Date.now();
            
            // Request wake lock to keep device awake
            if ('wakeLock' in navigator) {
                this.requestWakeLock();
            }
        } else {
            console.log('Tab became hidden');
            
            // Release wake lock when tab is hidden
            if (this.wakeLock) {
                this.wakeLock.release().then(() => {
                    this.wakeLock = null;
                    console.log('Wake Lock released');
                });
            }
        }
    }

    private handleInactivity(): void {
        if (this.connected) {
            // If we've been inactive, verify the connection
            this.verifyConnection();
        }
    }

    private verifyConnection(): void {
        // Check WebSocket readyState
        const socketClosed = !this.socket || 
                             this.socket.readyState === WebSocket.CLOSED || 
                             this.socket.readyState === WebSocket.CLOSING;
        
        // For mobile, perform more aggressive checking
        if (this.isMobileDevice) {
            // If socket doesn't exist or is closed/closing, reconnect
            if (socketClosed) {
                console.log('Connection appears to be dead, attempting to reconnect...');
                this.handleConnectionFailure({
                    type: 'network',
                    message: 'Connection lost (mobile device detected)',
                    timestamp: Date.now()
                });
                this.attemptReconnect();
                return;
            }
            
            // Even for OPEN sockets, ping the server to verify connection
            this.pingServer();
        } else {
            // Non-mobile behavior
            if (socketClosed) {
                console.log('Connection appears to be dead, attempting to reconnect...');
                this.handleConnectionFailure({
                    type: 'network',
                    message: 'Connection lost during inactivity',
                    timestamp: Date.now()
                });
                this.attemptReconnect();
            }
        }
    }

    /**
     * Socket message handler
     */
    private handleSocketMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data);
            
            // Handle pong messages
            if (message.event === 'pong') {
                this.handlePong(message.data);
                return;
            }
            
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
            
            // Handle chat messages
            if (message.event === 'chat_message') {
                console.log('Received chat message:', message.data);
                
                // Dispatch a custom event for chat components to listen to
                const chatEvent = new CustomEvent('socket_chat_message', {
                    detail: {
                        sender: message.data.sender,
                        message: message.data.message,
                        timestamp: message.data.timestamp
                    }
                });
                document.dispatchEvent(chatEvent);
            }
            
            // Handle player position updates
            if (message.event === 'player_position_update') {
                // Dispatch a custom event for player position updates
                const positionEvent = new CustomEvent('socket_player_position_update', {
                    detail: message.data
                });
                document.dispatchEvent(positionEvent);
            }
            
            // Handle initial player positions
            if (message.event === 'initial_player_positions') {
                // Dispatch a custom event for initial player positions
                const initialPositionsEvent = new CustomEvent('socket_initial_player_positions', {
                    detail: message.data
                });
                document.dispatchEvent(initialPositionsEvent);
            }
            
            // Handle player disconnection
            if (message.event === 'player_disconnected') {
                // Dispatch a custom event for player disconnection
                const disconnectEvent = new CustomEvent('socket_player_disconnected', {
                    detail: message.data
                });
                document.dispatchEvent(disconnectEvent);
            }
            
            // Reset last activity timestamp
            this.lastActivityTimestamp = Date.now();
            
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

    /**
     * Set up mobile-specific event handlers for connection management
     */
    private setupMobileEventHandlers(): void {
        if (!this.isMobileDevice) return;
        
        // Handle page show/hide events (more reliable on mobile)
        this.pageShowHandler = () => {
            console.log('Page became visible (pageshow event), checking connection...');
            this.lastActiveTime = Date.now();
            this.handleMobileResume();
        };
        window.addEventListener('pageshow', this.pageShowHandler);
        
        // Handle online/offline events
        this.onlineHandler = () => {
            console.log('Device went online, checking connection...');
            this.lastActiveTime = Date.now();
            this.handleNetworkStatusChange(true);
        };
        window.addEventListener('online', this.onlineHandler);
        
        this.offlineHandler = () => {
            console.log('Device went offline');
            this.handleNetworkStatusChange(false);
        };
        window.addEventListener('offline', this.offlineHandler);
        
        // Handle focus/blur for mobile app switching
        this.focusHandler = () => {
            console.log('Window regained focus, checking connection...');
            this.lastActiveTime = Date.now();
            
            // Calculate time since last active
            const timeSinceActive = Date.now() - this.lastActiveTime;
            
            // If we've been away for more than 2 seconds, treat as app switch
            if (timeSinceActive > 2000) {
                console.log(`App was in background for ${timeSinceActive/1000} seconds`);
                this.handleMobileAppReturn();
            } else {
                this.handleMobileResume();
            }
        };
        window.addEventListener('focus', this.focusHandler);
        
        this.blurHandler = () => {
            console.log('Window lost focus');
            // Update last active time when moving to background
            this.lastActiveTime = Date.now();
        };
        window.addEventListener('blur', this.blurHandler);
        
        // Handle device resume event (some mobile browsers)
        this.resumeHandler = () => {
            console.log('Device resume event detected');
            this.handleDeviceWake();
        };
        document.addEventListener('resume', this.resumeHandler);
        
        // Setup visibility change with device wake detection
        this.setupDeviceWakeDetection();
        
        console.log('Mobile device detected, specialized handlers added');
    }
    
    /**
     * Setup additional detection for device wake from sleep
     */
    private setupDeviceWakeDetection(): void {
        // Enhanced visibility change handler specifically for sleep/wake detection
        const originalHandler = this.visibilityChangeHandler;
        
        this.visibilityChangeHandler = () => {
            if (document.visibilityState === 'visible') {
                // Calculate time since last active
                const timeSinceActive = Date.now() - this.lastActiveTime;
                console.log(`Visibility changed to visible after ${timeSinceActive/1000} seconds`);
                
                // If we've been invisible for more than 5 seconds, likely a device wake
                if (timeSinceActive > 5000) {
                    console.log('Detected device wake from sleep');
                    this.handleDeviceWake();
                } else {
                    // For shorter durations, could be tab switching or brief interruptions
                    if (originalHandler) originalHandler();
                }
                
                // Update last active time
                this.lastActiveTime = Date.now();
            } else {
                // Update last active time when becoming invisible
                this.lastActiveTime = Date.now();
                console.log('Visibility changed to hidden');
            }
        };
    }
    
    /**
     * Handle when device wakes from sleep (power button)
     */
    private handleDeviceWake(): void {
        console.log('Handling device wake from sleep');
        
        // Force a network check
        // Some devices need time to reconnect to network after wake
        setTimeout(() => {
            if (navigator.onLine) {
                console.log('Network available after wake');
                
                // Always reconnect after device wake, regardless of current state
                this.reconnectAttempts = 0;
                
                // If we're not connected, attempt reconnection
                if (!this.connected) {
                    console.log('Not connected after device wake, forcing reconnection');
                    this.connectionState = ConnectionState.RECONNECTING;
                    this.attemptReconnect();
                } else {
                    // Even if connected, verify the connection is still good
                    this.verifyConnectionAggressively();
                }
            } else {
                console.log('No network after wake, waiting for online event');
            }
        }, 2000); // Wait 2 seconds for network to stabilize
    }
    
    /**
     * Handle when user returns to app after using another app
     */
    private handleMobileAppReturn(): void {
        console.log('Handling return from app switch');
        
        // Shorter delay for app switching vs. device wake
        setTimeout(() => {
            // Reset reconnection attempts to get a fresh start
            this.reconnectAttempts = 0;
            
            // Check connection state
            if (!this.connected) {
                console.log('Not connected after app switch, forcing reconnection');
                this.connectionState = ConnectionState.RECONNECTING;
                this.attemptReconnect();
            } else {
                // Even if connected, verify connection is still alive
                this.verifyConnectionAggressively();
            }
        }, 500); // Shorter delay for app switching
    }
    
    /**
     * Verify connection with more aggressive checks
     */
    private verifyConnectionAggressively(): void {
        console.log('Aggressively verifying connection status');
        
        // First check socket state
        const socketClosed = !this.socket || 
                            this.socket.readyState !== WebSocket.OPEN;
        
        if (socketClosed) {
            console.log('Socket is closed or not in OPEN state, reconnecting');
            this.handleConnectionFailure({
                type: 'network',
                message: 'Connection lost after device wake/app switch',
                timestamp: Date.now()
            });
            this.attemptReconnect();
            return;
        }
        
        // Even if socket appears open, verify with ping
        try {
            // Send a ping with higher timeout urgency
            this.send('ping', { 
                timestamp: Date.now(),
                urgent: true,
                source: 'wake_verification' 
            });
            console.log('Verification ping sent');
            
            // Set a short timeout to verify if we get a pong
            const urgentVerificationTimeout = setTimeout(() => {
                console.log('No pong received after urgent ping, forcing reconnect');
                this.handleConnectionFailure({
                    type: 'network',
                    message: 'Connection verification failed after wake/app switch',
                    timestamp: Date.now()
                });
                this.attemptReconnect();
            }, 3000); // Wait 3 seconds for response
            
            // Store the timeout to clear it if we get a pong
            (this.socket as any)._urgentVerificationTimeout = urgentVerificationTimeout;
        } catch (e) {
            console.error('Failed to send verification ping', e);
            this.handleConnectionFailure({
                type: 'network',
                message: 'Failed to verify connection after wake/app switch',
                timestamp: Date.now()
            });
            this.attemptReconnect();
        }
    }
    
    /**
     * Handle network status changes (online/offline)
     */
    private handleNetworkStatusChange(online: boolean): void {
        if (online && !this.connected && this.shouldAutoReconnect) {
            console.log('Network reconnected, attempting connection...');
            this.reconnectAttempts = 0;
            this.attemptReconnect();
        } else if (!online && this.connected) {
            console.log('Network disconnected, updating state...');
            this.handleConnectionFailure({
                type: 'network',
                message: 'Device went offline',
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Clean up event handlers
     */
    private cleanupEventHandlers(): void {
        // Remove existing handlers
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = null;
        }
        
        if (this.pageShowHandler) {
            window.removeEventListener('pageshow', this.pageShowHandler);
            this.pageShowHandler = null;
        }
        
        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler);
            this.onlineHandler = null;
        }
        
        if (this.offlineHandler) {
            window.removeEventListener('offline', this.offlineHandler);
            this.offlineHandler = null;
        }
        
        if (this.focusHandler) {
            window.removeEventListener('focus', this.focusHandler);
            this.focusHandler = null;
        }
        
        if (this.blurHandler) {
            window.removeEventListener('blur', this.blurHandler);
            this.blurHandler = null;
        }
        
        // Remove device resume handler
        if (this.resumeHandler) {
            document.removeEventListener('resume', this.resumeHandler);
            this.resumeHandler = null;
        }
    }
    
    /**
     * Send a ping to the server to verify connection
     */
    private pingServer(): void {
        try {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.send('ping', { timestamp: Date.now() });
                console.log('Ping sent to verify connection');
            }
        } catch (e) {
            console.error('Failed to send ping, connection appears dead', e);
            this.handleConnectionFailure({
                type: 'network',
                message: 'Failed to ping server',
                timestamp: Date.now()
            });
            this.attemptReconnect();
        }
    }

    /**
     * Set up persistent reconnection for mobile devices
     * This ensures that we keep trying to reconnect even after errors
     */
    private setupPersistentReconnection(): void {
        // Clear any existing interval
        if (this.persistentReconnectInterval) {
            clearInterval(this.persistentReconnectInterval);
        }
        
        // Create interval that periodically checks if we need to reconnect
        this.persistentReconnectInterval = setInterval(() => {
            // Only try to reconnect if we're not already connected and we should auto-reconnect
            if (!this.connected && this.shouldAutoReconnect) {
                const errorState = this.connectionState === ConnectionState.CONNECTION_ERROR;
                const disconnectedState = this.connectionState === ConnectionState.DISCONNECTED ||
                                         this.connectionState === ConnectionState.DISCONNECTED_BY_SERVER;
                
                // If we're in an error state or disconnected state, try reconnecting
                if (errorState || disconnectedState) {
                    console.log('Mobile persistent reconnection check triggered');
                    // Reset reconnect attempts to allow fresh start
                    this.reconnectAttempts = 0;
                    this.connectionState = ConnectionState.RECONNECTING;
                    this.attemptReconnect();
                }
            }
        }, this.mobilePersistentReconnectDelay);
    }

    /**
     * Handle mobile device resuming from sleep/background
     */
    private handleMobileResume(): void {
        if (this.mobileReconnectTimeout) {
            clearTimeout(this.mobileReconnectTimeout);
        }
        
        // Small delay to allow device to properly reconnect to network
        this.mobileReconnectTimeout = setTimeout(() => {
            console.log('Checking connection after mobile resume...');
            
            // Check if we need to reconnect
            if (!this.connected && this.shouldAutoReconnect) {
                console.log('Mobile device resumed but not connected, reconnecting...');
                this.attemptReconnect();
            } else if (this.connected) {
                // Verify connection is still alive
                this.verifyConnection();
            }
        }, 1000);
    }

    /**
     * Dispatch a connection state change event
     */
    private dispatchConnectionStateChange(): void {
        document.dispatchEvent(new CustomEvent('socket_connection_state_change', {
            detail: {
                state: this.getConnectionState()
            }
        }));
    }

    /**
     * Start the ping interval
     */
    private startPingInterval(): void {
        if (this.pingInterval) {
            window.clearInterval(this.pingInterval);
        }
        
        this.pingInterval = window.setInterval(() => {
            this.sendPing();
        }, this.pingIntervalMs);
    }

    /**
     * Stop the ping interval
     */
    private stopPingInterval(): void {
        if (this.pingInterval) {
            window.clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        // Clear any pending ping timeouts
        this.pingTimeouts.forEach(timeoutId => {
            window.clearTimeout(timeoutId);
        });
        this.pingTimeouts.clear();
    }

    /**
     * Send a ping to the server
     */
    private sendPing(): void {
        if (!this.socket || !this.connected) {
            this.currentPing = -1; // Reset ping when not connected
            return;
        }

        const pingSequence = Date.now();
        this.lastPingTime = pingSequence;

        // Set a timeout to detect if we don't get a pong response
        const timeoutId = window.setTimeout(() => {
            console.warn('Ping timeout - no response from server');
            this.pingTimeouts.delete(pingSequence);
            this.currentPing = -1; // Set to -1 to indicate ping failure
        }, 5000); // 5 second timeout

        this.pingTimeouts.set(pingSequence, timeoutId);

        this.send('ping', { 
            sequence: pingSequence,
            timestamp: pingSequence
        });
    }

    /**
     * Handle pong response from server
     */
    private handlePong(data: any): void {
        const pingSequence = data.received.sequence;
        const timeoutId = this.pingTimeouts.get(pingSequence);
        
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            this.pingTimeouts.delete(pingSequence);
            
            // Calculate ping time
            const pingTime = Date.now() - pingSequence;
            
            // Only update if the ping time is reasonable (less than 1 second)
            if (pingTime < 1000) {
                this.currentPing = pingTime;
            } else {
                console.warn('Received unreasonable ping time:', pingTime);
                this.currentPing = -1;
            }
        }
    }

    /**
     * Get the current ping in milliseconds
     * @returns The current ping in milliseconds, or -1 if no valid ping
     */
    public getCurrentPing(): number {
        return this.currentPing;
    }
}
