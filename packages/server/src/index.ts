import express from 'express';
import http from 'http';
import { GameServer } from './Server';

const PORT = process.env.PORT || 4733;
const app = express();
const server = http.createServer(app);

// Start listening before binding WS to allow clean handoff
server.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
});

// Attach WebSocket server to the HTTP server
const gameServer = new GameServer(server);
