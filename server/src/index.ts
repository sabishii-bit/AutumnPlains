import express from 'express';
import http from 'http';
import { GameServer } from './Server';

const PORT = process.env.PORT || 4733;
const app = express();
const server = http.createServer(app);

// Initialize the game server with the port
const gameServer = new GameServer(Number(PORT));

// Start listening for HTTP requests (WebSocket server is initialized in GameServer)
server.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
}); 