import { WebSocket } from 'ws';

export interface GameClient extends WebSocket {
  id: string;
  ip: string;
  publicIp?: string;
  userAgent: string;
}

export interface ClientInfo {
  id: string;
  ip: string;
  isLocal: boolean;
  timestamp: number;
}

export interface GameMessage {
  event: string;
  data: any;
} 