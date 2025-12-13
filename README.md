# Autumn Plains Game Engine

Simple game engine project written in Three.js and Cannon.es.
View running demo <a href="https://deref.nullptr.fail/">here.</a>

## Project Structure

This is a monorepo managed with pnpm workspaces containing:

- **packages/client** - Frontend Three.js game client
- **packages/server** - WebSocket game server
- **packages/shared** - Shared types and utilities

## Prerequisites

- Node.js (v16+)
- pnpm (v8+)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

Run both client and server in development mode:

```bash
pnpm dev
```

Or run them separately:

```bash
# Client only
pnpm dev:client

# Server only
pnpm dev:server
```

### Build

Build all packages:

```bash
pnpm build
```

Or build individually:

```bash
# Client only
pnpm build:client

# Server only
pnpm build:server
```

### Production

Start the production server:

```bash
pnpm start:server
```

## Package Scripts

- `pnpm dev` - Run client and server concurrently in development mode
- `pnpm dev:client` - Run client in development mode
- `pnpm dev:server` - Run server in development mode
- `pnpm build` - Build all packages
- `pnpm build:client` - Build client package
- `pnpm build:server` - Build server package
- `pnpm start:server` - Start production server

## Workspace Management

This project uses pnpm workspaces. To run commands in specific packages:

```bash
# Run command in specific package
pnpm --filter @autumnplains/client <command>
pnpm --filter @autumnplains/server <command>

# Add dependency to specific package
pnpm --filter @autumnplains/client add <package>
```
