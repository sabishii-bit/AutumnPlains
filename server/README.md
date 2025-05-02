# AutumnPlains Game Server

A simple Socket.io server for establishing connections with AutumnPlains game clients.

## Setup

### Local Development

1. Install dependencies:
```
cd server
npm install
```

2. Start the development server:
```
npm run dev
```

3. Build for production:
```
npm run build
npm start
```

### Docker Deployment

#### Build the Docker image:
```
cd server
docker build -t autumnplains-server .
```

#### Run the container:
```
docker run -p 4733:4733 autumnplains-server
```

#### Run in detached mode (background):
```
docker run -d -p 4733:4733 autumnplains-server
```

#### Run with custom port mapping (e.g., host port 8080 to container port 4733):
```
docker run -p 8080:4733 autumnplains-server
```

## Configuration

By default, the server runs on port 4733. You can change this by setting the `PORT` environment variable.

When using Docker, you can set environment variables like this:
```
docker run -p 4733:4733 -e PORT=5000 autumnplains-server
```

## Connection URL

When connecting from the client, use:
- For local development: `http://localhost:4733`
- For Docker on same machine: `http://localhost:4733` (or whatever port you mapped to)
- For production: Use your domain or server IP

## Available Events

### Server to Client
- `connected` - Sent when a client successfully connects, includes the socket ID

### Client to Server
- No specific events required, just establish a connection 