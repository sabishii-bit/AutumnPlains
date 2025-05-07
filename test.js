const http = require('http');
const { WebSocketServer } = require('ws');

const server = http.createServer();

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket connected');
  ws.send('hello from test server');

  ws.on('message', (msg) => {
    console.log('received:', msg.toString());
    ws.send(`echo: ${msg}`);
  });
});

server.listen(4733, () => {
  console.log('Test WebSocket server running on port 4733');
});
