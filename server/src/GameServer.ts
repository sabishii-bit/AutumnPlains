import { Server, Socket } from 'socket.io';

/**
 * GameServer - Simple connection handler
 */
export class GameServer {
  /**
   * Constructor - sets up connection handler
   * @param io Socket.io server instance
   */
  constructor(private io: Server) {
    this.setupSocketHandlers();
    console.log('Game server initialized');
  }
  
  /**
   * Set up basic socket event handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Send connection confirmation to the client
      socket.emit('connected', { id: socket.id });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
} 