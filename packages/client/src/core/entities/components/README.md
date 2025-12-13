# Component System

This directory contains a component-based architecture for game objects, allowing for modular and reusable functionality.

## Overview

The component system allows GameObjects to compose their behavior from discrete, reusable components rather than inheriting all functionality from a monolithic base class. This reduces unnecessary code loading and improves maintainability.

## Core Components

### Component Manager (`Component.ts`)
- **ComponentManager**: Manages all components attached to a GameObject
- **Component**: Base interface that all components must implement

### Physics Components

#### PhysicsSyncComponent
Synchronizes the visual mesh with the physics body position and rotation.
- **Use when**: Object has a physics body that needs visual representation
- **Updates**: Every frame via `update(deltaTime)`

#### PhysicsForceComponent
Handles force, impulse, and velocity operations on physics bodies.
- **Use when**: Object needs to apply forces or modify velocity
- **Methods**: `applyCentralForce()`, `applyCentralImpulse()`, `getLinearVelocity()`, `setLinearVelocity()`, `activate()`

### Rendering Components

#### WireframeComponent
Creates and manages wireframe visualization of collision meshes for debugging.
- **Use when**: Object needs wireframe debugging visualization
- **Methods**: `createWireframe()`, `toggleVisibility()`, `setVisibility()`, `getVisibility()`

### Character Components

#### GroundDetectionComponent
Performs raycasting to detect ground contact for characters.
- **Use when**: Object needs to detect if it's on the ground (e.g., characters)
- **Methods**: `isGrounded()`, `hasLandedRecently()`, `setHalfHeight()`
- **Updates**: Every frame via `update(deltaTime)`

#### CharacterMovementComponent
Handles character movement, jumping, and velocity control.
- **Use when**: Object needs character-style movement controls
- **Methods**: `updatePosition()`, `jump()`, `setVelocity()`, `setAcceleration()`, `setMoveSpeed()`, `setJumpHeight()`

#### UprightConstraintComponent
Enforces upright orientation on physics bodies (locks rotation to Y-axis only).
- **Use when**: Character or object should remain upright
- **Methods**: `enforceUpright()`, `stabilizeOnGround()`
- **Updates**: Every frame via `update(deltaTime)`

### Projectile Components

#### RaycastCollisionComponent
Performs raycast-based collision detection.
- **Use when**: Object needs hitscan/raycast collision (e.g., bullets, lasers)
- **Methods**: `checkCollision()`, `getHitObject()`, `getHitPosition()`, `getHitNormal()`, `setMaxRaycastDistance()`, `setExcludeTypes()`

#### CameraProjectileComponent
Updates projectile origin and direction from the player camera.
- **Use when**: Projectile originates from camera (first-person shooting)
- **Methods**: `updateFromCamera()`, `getOrigin()`, `getDirection()`, `reset()`

## Usage Example

### Basic GameObject with Physics
```typescript
import GameObject from './GameObject';
import { PhysicsSyncComponent, WireframeComponent, PhysicsForceComponent } from '../components';

export class MyObject extends GameObject {
    constructor(position: Vector3) {
        super({ position });

        // Add components as needed
        this.addComponent('physicsSync', new PhysicsSyncComponent());
        this.addComponent('wireframe', new WireframeComponent());
        this.addComponent('physicsForce', new PhysicsForceComponent());
    }

    protected createVisualMesh() {
        // Create visual mesh
    }

    protected createCollisionMesh() {
        // Create collision mesh
    }
}
```

### Character GameObject
```typescript
import { BaseCharacter } from './characters/BaseCharacter';

export class MyCharacter extends BaseCharacter {
    constructor(position: Vector3) {
        super(position);

        // BaseCharacter already adds:
        // - PhysicsSyncComponent
        // - WireframeComponent
        // - PhysicsForceComponent
        // - GroundDetectionComponent
        // - CharacterMovementComponent
        // - UprightConstraintComponent

        // You can access them via:
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        movement?.setMoveSpeed(10);
    }
}
```

### Projectile GameObject
```typescript
import BaseProjectile from './projectiles/BaseProjectile';

export class MyProjectile extends BaseProjectile {
    constructor() {
        super();

        // BaseProjectile already adds:
        // - CameraProjectileComponent
        // - RaycastCollisionComponent
    }

    public fire() {
        if (this.checkCollisions()) {
            console.log('Hit:', this.getHitObject());
        }
    }

    protected createVisualMesh() {
        // Create projectile visual
    }

    protected createCollisionMesh() {
        // Projectiles typically don't need collision mesh
    }
}
```

## Component Lifecycle

1. **Initialization**: Component's `initialize(owner)` is called when added to GameObject
2. **Update**: Component's `update(deltaTime)` is called every frame (if implemented)
3. **Cleanup**: Component's `cleanup()` is called when removed (if implemented)

## Benefits

- **Modularity**: Only load components you need
- **Reusability**: Components can be shared across different object types
- **Maintainability**: Changes to one component don't affect others
- **Performance**: Objects only run code for features they use
- **Flexibility**: Easy to add/remove features at runtime

## Adding New Components

1. Create a new file in this directory (e.g., `MyComponent.ts`)
2. Implement the `Component` interface
3. Add initialization logic in `initialize(owner)`
4. Add update logic in `update(deltaTime)` if needed
5. Add cleanup logic in `cleanup()` if needed
6. Export from `index.ts`

Example:
```typescript
import { Component } from './Component';
import GameObject from '../objects/GameObject';

export class MyComponent implements Component {
    private owner!: GameObject;

    public initialize(owner: GameObject): void {
        this.owner = owner;
        // Setup component
    }

    public update(deltaTime: number): void {
        // Update component each frame
    }

    public cleanup(): void {
        // Clean up resources
    }

    // Add your custom methods
    public myMethod(): void {
        // Custom functionality
    }
}
```

## Notes

- Components have access to their owner GameObject via `this.owner`
- Components can get other components via `this.owner.getComponent<T>(name)`
- Not all components need to implement `update()` or `cleanup()`
- Use descriptive component names (e.g., 'physicsSync', 'groundDetection')
