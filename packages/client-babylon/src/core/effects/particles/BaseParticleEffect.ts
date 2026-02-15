import { Scene, Vector3, ParticleSystem, Color4, Texture } from '@babylonjs/core';

/**
 * Base class for particle effects using Babylon.js ParticleSystem
 * Provides a clean wrapper around Babylon's particle system with pooling support
 */
export abstract class BaseParticleEffect {
    protected particleSystem!: ParticleSystem;
    protected scene: Scene;
    protected isActive: boolean = false;
    protected duration: number = 1.0; // Default 1 second
    protected lifetime: number = 0;
    protected autoRecycle: boolean = true;

    constructor(scene: Scene, name: string = 'ParticleEffect') {
        this.scene = scene;
        this.particleSystem = new ParticleSystem(name, 100, scene);
        this.setupParticleSystem();
    }

    /**
     * Setup the particle system - must be implemented by subclasses
     */
    protected abstract setupParticleSystem(): void;

    /**
     * Start the particle effect at a given position
     */
    public play(position: Vector3): void {
        this.particleSystem.emitter = position.clone();
        this.particleSystem.start();
        this.isActive = true;
        this.lifetime = 0;
    }

    /**
     * Stop the particle effect
     */
    public stop(): void {
        this.particleSystem.stop();
        this.isActive = false;
        this.lifetime = 0;
    }

    /**
     * Reset the particle effect (for pooling)
     */
    public reset(): void {
        this.stop();
        this.particleSystem.reset();
    }

    /**
     * Update the particle effect
     */
    public update(deltaTime: number): void {
        if (!this.isActive) return;

        this.lifetime += deltaTime;

        // Auto-stop after duration
        if (this.autoRecycle && this.lifetime >= this.duration) {
            this.stop();
        }
    }

    /**
     * Check if the effect is still active
     */
    public checkActive(): boolean {
        return this.isActive;
    }

    /**
     * Set the duration of the effect
     */
    public setDuration(duration: number): void {
        this.duration = duration;
    }

    /**
     * Set whether to auto-recycle after duration
     */
    public setAutoRecycle(autoRecycle: boolean): void {
        this.autoRecycle = autoRecycle;
    }

    /**
     * Get the particle system for advanced customization
     */
    public getParticleSystem(): ParticleSystem {
        return this.particleSystem;
    }

    /**
     * Dispose of the particle effect
     */
    public dispose(): void {
        this.particleSystem.dispose();
    }

    /**
     * Set emitter position
     */
    public setPosition(position: Vector3): void {
        this.particleSystem.emitter = position.clone();
    }
}
