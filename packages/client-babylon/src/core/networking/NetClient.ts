import { ConnectionState, type ConnectionError } from './ConnectionState';

// Re-export enum for convenience (interfaces are compile-time only, cannot be re-exported)
export { ConnectionState };

/**
 * NetClient - WebSocket client for game server communication
 * Handles connection, reconnection, and message passing
 */
export class NetClient {
    private static instance: NetClient;
    private socket: WebSocket | null = null;
    private connected: boolean = false;
    private serverUrl: string = '';
    private reconnecting: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 2000; // ms
    private shouldAutoReconnect: boolean = true;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private lastError: ConnectionError | null = null;

    // Ping tracking
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private lastPingTime: number = 0;
    private currentPing: number = -1;
    private readonly pingIntervalMs = 1000;
    private pingTimeouts: Map<number, ReturnType<typeof setTimeout>> = new Map();

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): NetClient {
        if (!NetClient.instance) {
            NetClient.instance = new NetClient();
        }
        return NetClient.instance;
    }

    /**
     * Connect to the server
     */
    public connect(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.serverUrl = url;
                console.log(`[NetClient] Connecting to: ${url}`);
                this.connectionState = ConnectionState.CONNECTING;

                // Clean up any existing connection
                this.cleanupConnection();

                // Create WebSocket connection
                this.socket = new WebSocket(url);

                // Set connection timeout
                const connectionTimeout = setTimeout(() => {
                    if (!this.connected) {
                        this.handleConnectionFailure({
                            type: 'timeout',
                            message: 'Connection timeout after 10 seconds',
                            timestamp: Date.now()
                        });
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

                this.socket.onopen = () => {
                    clearTimeout(connectionTimeout);
                    this.connected = true;
                    this.reconnecting = false;
                    this.reconnectAttempts = 0;
                    this.connectionState = ConnectionState.CONNECTED;
                    this.lastError = null;
                    console.log('[NetClient] Connected successfully');
                    this.startPingInterval();
                    resolve();
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.socket.onerror = (error) => {
                    console.error('[NetClient] WebSocket error:', error);
                    this.handleConnectionFailure({
                        type: 'websocket',
                        message: 'WebSocket error occurred',
                        timestamp: Date.now()
                    });
                };

                this.socket.onclose = (event) => {
                    console.log('[NetClient] Connection closed:', event.code, event.reason);
                    this.connected = false;
                    this.stopPingInterval();

                    if (event.code === 1000) {
                        // Normal closure
                        this.connectionState = ConnectionState.DISCONNECTED_BY_CLIENT;
                    } else if (event.code === 1001) {
                        // Server closed
                        this.connectionState = ConnectionState.DISCONNECTED_BY_SERVER;
                    } else {
                        this.connectionState = ConnectionState.CONNECTION_ERROR;
                    }

                    // Attempt reconnection if not intentional disconnect
                    if (this.shouldAutoReconnect && event.code !== 1000) {
                        this.attemptReconnect();
                    }
                };

            } catch (error) {
                console.error('[NetClient] Connection failed:', error);
                this.handleConnectionFailure({
                    type: 'unknown',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: Date.now()
                });
                reject(error);
            }
        });
    }

    /**
     * Disconnect from server
     */
    public disconnect(): void {
        this.shouldAutoReconnect = false;
        if (this.socket) {
            this.socket.close(1000, 'Client disconnect');
        }
        this.cleanupConnection();
        this.connectionState = ConnectionState.DISCONNECTED_BY_CLIENT;
        console.log('[NetClient] Disconnected');
    }

    /**
     * Send message to server
     */
    public send(type: string, data: any): void {
        if (!this.connected || !this.socket) {
            console.warn('[NetClient] Cannot send - not connected');
            return;
        }

        try {
            const message = JSON.stringify({ type, data });
            this.socket.send(message);
        } catch (error) {
            console.error('[NetClient] Failed to send message:', error);
        }
    }

    /**
     * Handle incoming messages
     */
    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data);

            // Handle pong response
            if (message.type === 'pong') {
                this.handlePong(message.data.sequence);
                return;
            }

            // Emit message event for other handlers
            document.dispatchEvent(new CustomEvent('network_message', { detail: message }));
        } catch (error) {
            console.error('[NetClient] Failed to parse message:', error);
        }
    }

    /**
     * Start ping interval
     */
    private startPingInterval(): void {
        this.stopPingInterval();
        this.pingInterval = setInterval(() => {
            this.sendPing();
        }, this.pingIntervalMs);
    }

    /**
     * Stop ping interval
     */
    private stopPingInterval(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        this.pingTimeouts.forEach(timeout => clearTimeout(timeout));
        this.pingTimeouts.clear();
    }

    /**
     * Send ping to server
     */
    private sendPing(): void {
        const sequence = Date.now();
        this.lastPingTime = sequence;
        this.send('ping', { sequence });

        // Set timeout for this ping
        const timeout = setTimeout(() => {
            this.pingTimeouts.delete(sequence);
        }, 5000);

        this.pingTimeouts.set(sequence, timeout);
    }

    /**
     * Handle pong response
     */
    private handlePong(sequence: number): void {
        const timeout = this.pingTimeouts.get(sequence);
        if (timeout) {
            clearTimeout(timeout);
            this.pingTimeouts.delete(sequence);
        }

        if (sequence === this.lastPingTime) {
            this.currentPing = Date.now() - sequence;
        }
    }

    /**
     * Attempt to reconnect
     */
    private attemptReconnect(): void {
        if (this.reconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[NetClient] Max reconnect attempts reached');
            return;
        }

        this.reconnecting = true;
        this.reconnectAttempts++;
        this.connectionState = ConnectionState.RECONNECTING;

        console.log(`[NetClient] Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect(this.serverUrl).catch(err => {
                console.error('[NetClient] Reconnect failed:', err);
            });
        }, this.reconnectDelay);
    }

    /**
     * Handle connection failure
     */
    private handleConnectionFailure(error: ConnectionError): void {
        this.lastError = error;
        this.connectionState = ConnectionState.CONNECTION_ERROR;
        console.error('[NetClient] Connection failure:', error);
    }

    /**
     * Clean up connection
     */
    private cleanupConnection(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.stopPingInterval();

        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onerror = null;
            this.socket.onclose = null;
            this.socket = null;
        }

        this.connected = false;
    }

    // Getters
    public isConnected(): boolean {
        return this.connected;
    }

    public getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    public getCurrentPing(): number {
        return this.currentPing;
    }

    public getReconnectAttempts(): number {
        return this.reconnectAttempts;
    }

    public getLastError(): ConnectionError | null {
        return this.lastError;
    }
}
