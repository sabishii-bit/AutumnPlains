import SimplePeer from 'simple-peer';

/**
 * WebRTCPeer - Wraps a simple-peer connection to another player
 * Handles WebRTC data channel for low-latency game state updates
 */
export class WebRTCPeer {
    private peer: SimplePeer.Instance;
    private peerId: string;
    private connected: boolean = false;
    private onDataCallback: ((data: any) => void) | null = null;
    private onCloseCallback: (() => void) | null = null;

    constructor(
        peerId: string,
        initiator: boolean,
        onSignal: (signal: SimplePeer.SignalData) => void
    ) {
        this.peerId = peerId;

        console.log(`[WebRTCPeer] Creating peer connection to ${peerId}, initiator: ${initiator}`);

        // Create SimplePeer instance with unreliable, unordered data channel for game data
        this.peer = new SimplePeer({
            initiator,
            trickle: true, // Allow ICE candidates to trickle
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            },
            channelConfig: {
                ordered: false, // Don't guarantee order (faster)
                maxRetransmits: 0 // Don't retransmit (UDP-like)
            }
        });

        // Set up event handlers
        this.peer.on('signal', (data) => {
            console.log(`[WebRTCPeer] Signal generated for ${this.peerId}`);
            onSignal(data);
        });

        this.peer.on('connect', () => {
            this.connected = true;
            console.log(`[WebRTCPeer] Connected to ${this.peerId}`);
        });

        this.peer.on('data', (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (this.onDataCallback) {
                    this.onDataCallback(message);
                }
            } catch (error) {
                console.error('[WebRTCPeer] Error parsing data:', error);
            }
        });

        this.peer.on('close', () => {
            this.connected = false;
            console.log(`[WebRTCPeer] Connection closed to ${this.peerId}`);
            if (this.onCloseCallback) {
                this.onCloseCallback();
            }
        });

        this.peer.on('error', (err) => {
            console.error(`[WebRTCPeer] Error with ${this.peerId}:`, err);
        });
    }

    /**
     * Process incoming signal from remote peer
     */
    public signal(signal: SimplePeer.SignalData): void {
        try {
            this.peer.signal(signal);
        } catch (error) {
            console.error('[WebRTCPeer] Error processing signal:', error);
        }
    }

    /**
     * Send data to the remote peer
     */
    public send(data: any): void {
        if (!this.connected) {
            console.warn(`[WebRTCPeer] Cannot send to ${this.peerId}: not connected`);
            return;
        }

        try {
            const message = JSON.stringify(data);
            this.peer.send(message);
        } catch (error) {
            console.error('[WebRTCPeer] Error sending data:', error);
        }
    }

    /**
     * Set callback for incoming data
     */
    public onData(callback: (data: any) => void): void {
        this.onDataCallback = callback;
    }

    /**
     * Set callback for connection close
     */
    public onClose(callback: () => void): void {
        this.onCloseCallback = callback;
    }

    /**
     * Check if connected
     */
    public isConnected(): boolean {
        return this.connected;
    }

    /**
     * Get peer ID
     */
    public getPeerId(): string {
        return this.peerId;
    }

    /**
     * Close the connection
     */
    public destroy(): void {
        this.peer.destroy();
        this.connected = false;
    }
}
