/**
 * Connection state enum for tracking network status
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
 * Connection error interface
 */
export interface ConnectionError {
    type: 'timeout' | 'websocket' | 'network' | 'server' | 'unknown';
    message: string;
    code?: number;
    timestamp: number;
}
