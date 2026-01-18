import type { Scene } from '@babylonjs/core';
import type { LightingManager } from '../lighting/LightingManager';

/**
 * Abstract base class for all maps/levels
 * Maps handle environment setup, props, and level-specific logic
 */
export abstract class BaseMap {
    protected scene: Scene;
    protected lightingManager: LightingManager;

    constructor(scene: Scene, lightingManager: LightingManager) {
        this.scene = scene;
        this.lightingManager = lightingManager;
    }

    /**
     * Initialize the map - create environment, props, etc.
     * Can be async to support loading models and other assets
     */
    public abstract initialize(): void | Promise<void>;

    /**
     * Update map logic each frame
     */
    public abstract update(deltaTime: number): void;

    /**
     * Clean up map resources
     */
    public abstract dispose(): void;
}
