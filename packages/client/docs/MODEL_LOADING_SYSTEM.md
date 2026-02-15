# Model Loading System

## Overview

The Babylon.js client uses an efficient model loading system based on **AssetContainers** and **instancing** for optimal performance. This system is significantly more performant than the previous Three.js implementation.

## Architecture

### 1. **ModelRegistry** (`core/services/ModelRegistry.ts`)
Global singleton that manages all loaded AssetContainers.

**Features:**
- Prevents duplicate loading of the same model
- Tracks loading state (loaded vs loading)
- Provides cache management and disposal

**Usage:**
```typescript
const registry = ModelRegistry.getInstance();
const container = registry.getContainer('/assets/models/example.gltf');
```

### 2. **ModelLoaderService** (`core/services/ModelLoaderService.ts`)
Service for loading models into AssetContainers and instantiating them.

**Features:**
- Async model loading with `LoadAssetContainerAsync`
- Efficient instancing via `instantiateModelsToScene()`
- Automatic caching via ModelRegistry
- Supports preloading for loading screens

**Usage:**
```typescript
const loader = new ModelLoaderService(scene);

// Load and instantiate in one call
const entries = await loader.loadAndInstantiateAsync(
    '/assets/models/example.gltf',
    {
        position: new Vector3(0, 0, 0),
        scale: new Vector3(1, 1, 1),
        enableShadows: true
    }
);

// Or preload for later use
await loader.preloadModelAsync('/assets/models/example.gltf');
const entries = loader.instantiateModel('/assets/models/example.gltf');
```

### 3. **ImportedModel** (`core/entities/objects/imported/ImportedModel.ts`)
Base entity class for imported 3D models with optional physics support.

**Features:**
- Wraps `InstantiatedEntries` in an Entity
- Automatic physics setup (static or dynamic)
- Configurable physics shapes (box, mesh, etc.)
- Proper disposal and cleanup

**Usage:**
```typescript
export class MyModel extends ImportedModel {
    constructor(scene: Scene, position: Vector3) {
        super(scene, getModelPath('my_model/scene.gltf'), {
            position,
            scale: new Vector3(1, 1, 1),
            enablePhysics: true,
            physicsMass: 0, // Static
            name: 'MyModel'
        });
    }

    // Optional: override for custom physics shapes
    protected createPhysicsShape(mesh: AbstractMesh): any {
        return { type: PhysicsShapeType.MESH }; // Use mesh collision
    }
}
```

### 4. **Example Models**
- **JapaneseRestaurant** - Large static building with mesh collision
- **OutskirtStand** - Small static prop with mesh collision

## Performance Benefits

### Compared to Three.js Implementation:

1. **AssetContainer vs Manual Caching**
   - Built-in Babylon.js system optimized for model pooling
   - No manual cache management (LRU, timestamps, etc.)
   - Better memory management

2. **Instancing vs Cloning**
   - `instantiateModelsToScene()` is optimized for GPU instancing
   - Shares materials by default (less memory)
   - Faster than full cloning

3. **Havok Physics vs Ammo.js**
   - Shared collision shapes across instances
   - No per-instance trimesh creation (massive performance win)
   - Better suited for static architecture

4. **Async/Await Pattern**
   - Modern async model loading
   - Easy parallel preloading
   - Better error handling

## Usage in Maps

```typescript
export class TestMap extends BaseMap {
    private restaurant?: JapaneseRestaurant;

    public async initialize(): Promise<void> {
        // Load imported model
        this.restaurant = new JapaneseRestaurant(
            this.scene,
            new Vector3(10, 0, 10)
        );
        await this.restaurant.loadAsync();

        // Enable shadows
        this.restaurant.getRootNodes().forEach(node => {
            node.getChildMeshes().forEach(mesh => {
                this.lightingManager.addShadowCaster(mesh);
            });
        });
    }

    public dispose(): void {
        this.restaurant?.dispose();
    }
}
```

## Creating New Imported Models

1. Add your GLTF/GLB file to `packages/assets/public/models/your_model/`
2. Create a new class extending `ImportedModel`:

```typescript
import { Scene, Vector3, PhysicsShapeType } from '@babylonjs/core';
import { ImportedModel, ImportedModelOptions } from './ImportedModel';
import { getModelPath } from '@autumnplains/assets';

export class YourModel extends ImportedModel {
    constructor(scene: Scene, position: Vector3, options: Partial<ImportedModelOptions> = {}) {
        super(scene, getModelPath('your_model/scene.gltf'), {
            position,
            scale: new Vector3(1, 1, 1),
            enableShadows: true,
            enablePhysics: true,
            physicsMass: 0, // 0 = static, >0 = dynamic
            name: 'YourModel',
            ...options
        });
    }

    // Optional: customize physics shape
    protected createPhysicsShape(mesh: any): any {
        return { type: PhysicsShapeType.BOX }; // or MESH for accuracy
    }
}
```

3. Export from `imported/index.ts`:
```typescript
export { YourModel } from './YourModel';
```

## Best Practices

1. **Preload models during loading screens:**
   ```typescript
   await modelLoader.preloadModelsAsync([
       getModelPath('model1/scene.gltf'),
       getModelPath('model2/scene.gltf')
   ]);
   ```

2. **Use box collision for static objects when possible** - Much faster than mesh collision

3. **Share materials** - Don't clone materials unless necessary (default behavior)

4. **Dispose models when no longer needed:**
   ```typescript
   myModel.dispose(); // Cleans up meshes and physics
   ```

5. **Use mesh collision for complex static architecture** - Acceptable performance for non-moving objects

## File Structure

```
src/core/
├── services/
│   ├── ModelRegistry.ts          # Global AssetContainer registry
│   └── ModelLoaderService.ts     # Model loading service
└── entities/
    └── objects/
        └── imported/
            ├── ImportedModel.ts       # Base class
            ├── JapaneseRestaurant.ts  # Example: large building
            ├── OutskirtStand.ts       # Example: small prop
            └── index.ts               # Exports
```

## Asset Management

All models are stored in the `@autumnplains/assets` package for sharing between clients:

```typescript
import { getModelPath } from '@autumnplains/assets';

const modelPath = getModelPath('japanese_restaurant/scene.gltf');
// Returns: '/assets/models/japanese_restaurant/scene.gltf'
```
