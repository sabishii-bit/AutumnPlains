# Autumn Plains - Babylon.js Client

This is a complete architectural rewrite of the client using **Babylon.js** and **Havok** physics engine with a clean **ECS (Entity Component System)** architecture.

## Architecture Overview

### Core Systems

- **Engine** (`src/core/engine/Engine.ts`): Main engine initialization, render loop, and system orchestration
- **Entity Manager** (`src/core/entities/EntityManager.ts`): Global entity lifecycle management
- **Camera Controller** (`src/core/camera/CameraController.ts`): First/third-person camera system with target following
- **Input Manager** (`src/core/controls/InputManager.ts`): Keyboard and mouse input handling with pointer lock

### ECS Architecture

#### Entity System
- **Entity** (`src/core/entities/Entity.ts`): Base entity class with component management and transform
- Each entity has a `TransformNode` for position/rotation/scale
- Components can be added/removed dynamically

#### Component System
- **Component** (`src/core/entities/components/Component.ts`): Base component interface
- **MeshComponent**: Visual mesh representation (box, sphere, capsule)
- **PhysicsComponent**: Havok physics integration (impostors, forces, velocity)
- **CharacterMovementComponent**: WASD movement and jump controls

#### Game Objects
- **PlayerCharacter** (`src/core/entities/objects/PlayerCharacter.ts`): Combines mesh, physics, and movement components

### Physics

- **Havok Physics**: WebAssembly-based physics engine (production-ready, high performance)
- Gravity: `(0, -15, 0)` - matches the adjusted gravity from Three.js version
- Physics impostors for collision and dynamics

## Key Improvements Over Three.js Version

1. **Cleaner ECS**: Components are true data/behavior containers, entities are pure containers
2. **Better Physics**: Havok is more performant and stable than Ammo.js
3. **Unified API**: Babylon.js has integrated physics, no need for separate physics world management
4. **Modern Patterns**: Uses TypeScript interfaces, dependency injection, and singleton patterns properly
5. **Simpler Structure**: Less boilerplate, more idiomatic code

## Getting Started

### Install Dependencies

```bash
# From the monorepo root
pnpm install

# Or from this package
cd packages/client-babylon
pnpm install
```

### Run Development Server

```bash
# From monorepo root
pnpm run dev:client-babylon

# Or from this package
pnpm run dev
```

The dev server will start on `http://localhost:3000`

### Build for Production

```bash
# From monorepo root
pnpm run build:client-babylon

# Or from this package
pnpm run build
```

## Project Structure

```
packages/client-babylon/
├── src/
│   ├── core/
│   │   ├── camera/
│   │   │   └── CameraController.ts      # Camera system
│   │   ├── controls/
│   │   │   └── InputManager.ts          # Input handling
│   │   ├── engine/
│   │   │   └── Engine.ts                # Main engine
│   │   ├── entities/
│   │   │   ├── components/              # ECS components
│   │   │   │   ├── Component.ts
│   │   │   │   ├── MeshComponent.ts
│   │   │   │   ├── PhysicsComponent.ts
│   │   │   │   └── CharacterMovementComponent.ts
│   │   │   ├── objects/                 # Game objects
│   │   │   │   └── PlayerCharacter.ts
│   │   │   ├── Entity.ts                # Base entity
│   │   │   └── EntityManager.ts         # Entity management
│   │   └── physics/                     # (Future) Physics utilities
│   └── index.ts                         # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Controls

- **WASD / Arrow Keys**: Move character
- **Space**: Jump
- **Mouse**: Look around (pointer lock required - click canvas to activate)

## Next Steps

To fully replicate the Three.js client features, implement:

1. **Network Integration**: Port `NetworkManager` and `PlayerSynchronizer`
2. **State Machine**: Port character state system (Idle, Walking, Jumping, Airborne, Landing)
3. **Projectiles**: Port `ProjectileManager` system
4. **Particles**: Implement particle effects system
5. **UI/HUD**: Port HUD and UI components using `@babylonjs/gui`
6. **Maps/Environment**: Port map system with proper models and textures
7. **Advanced Physics Components**: Ground detection, upright constraint, raycast collision
8. **Mobile Controls**: Port nipplejs integration for mobile support

## Dependencies

- `@babylonjs/core`: Main Babylon.js library
- `@babylonjs/havok`: Havok physics plugin
- `@babylonjs/loaders`: Model loaders (GLTF, OBJ, etc.)
- `@babylonjs/materials`: Additional materials library
- `@babylonjs/gui`: GUI system for HUD
- `nipplejs`: Touch joystick for mobile (optional)

## Notes

- The original Three.js client remains at `packages/client`
- This is a clean rewrite, not a port - design patterns are improved
- Physics uses Havok instead of Ammo.js for better performance
- Camera defaults to third-person following player character
- All systems use singleton pattern for global access where appropriate
