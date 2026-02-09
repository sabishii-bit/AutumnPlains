declare module 'simple-peer' {
    import { EventEmitter } from 'events';

    namespace SimplePeer {
        interface Options {
            initiator?: boolean;
            channelConfig?: RTCDataChannelInit;
            channelName?: string;
            config?: RTCConfiguration;
            offerOptions?: RTCOfferOptions;
            answerOptions?: RTCAnswerOptions;
            sdpTransform?: (sdp: string) => string;
            stream?: MediaStream;
            streams?: MediaStream[];
            trickle?: boolean;
            allowHalfTrickle?: boolean;
            wrtc?: {
                RTCPeerConnection: typeof RTCPeerConnection;
                RTCSessionDescription: typeof RTCSessionDescription;
                RTCIceCandidate: typeof RTCIceCandidate;
            };
        }

        interface SignalData {
            type?: 'offer' | 'answer' | 'pranswer' | 'rollback';
            sdp?: string;
            candidate?: RTCIceCandidateInit;
        }

        interface Instance extends EventEmitter {
            send(data: string | Buffer | ArrayBuffer | Blob): void;
            signal(data: SignalData | string): void;
            destroy(err?: Error): void;
            readonly destroyed: boolean;
            readonly bufferSize: number;

            // Event handlers
            on(event: 'signal', listener: (data: SignalData) => void): this;
            on(event: 'connect', listener: () => void): this;
            on(event: 'data', listener: (data: Buffer) => void): this;
            on(event: 'stream', listener: (stream: MediaStream) => void): this;
            on(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
            on(event: 'close', listener: () => void): this;
            on(event: 'error', listener: (err: Error) => void): this;
        }
    }

    interface SimplePeerConstructor {
        new (opts?: SimplePeer.Options): SimplePeer.Instance;
        (opts?: SimplePeer.Options): SimplePeer.Instance;
        WEBRTC_SUPPORT: boolean;
    }

    const SimplePeer: SimplePeerConstructor;
    export = SimplePeer;
}
