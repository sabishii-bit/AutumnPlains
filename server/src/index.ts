import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { GameServer } from './GameServer';

const PORT = process.env.PORT || 4733;
const app = express();
const server = http.createServer(app);

// Set up Socket.io server with CORS enabled
const io = new Server(server, {
  cors: {
    origin: '*', // In production, you'd want to restrict this
    methods: ['GET', 'POST']
  }
});

// Initialize the game server
const gameServer = new GameServer(io);

// Start listening for connections
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 