import { Scene } from '@babylonjs/core';
import { BaseParticleEffect } from './BaseParticleEffect';

/**
 * Poolable particle effect interface
 */
interface PoolableEffect {
    play(position: any): void;
    stop(): void;
    reset(): void;
    update(deltaTime: number): void;
    checkActive(): boolean;
    dispose(): void;
}

/**
 * Manages particle effects with object pooling
 * Singleton pattern for centralized particle management
 */
export class ParticleEffectManager {
    private static instance: ParticleEffectManager;
    private scene!: Scene;

    // Pool management
    private effectPools: Map<string, PoolableEffect[]> = new Map();
    private activeEffects: Map<string, PoolableEffect[]> = new Map();

    // Configuration
    private maxPoolSize: number = 10; // Max pooled instances per type
    private maxActivePerType: number = 20; // Max active effects per type

    private constructor() {}

    /**
     * Get singleton instance
     */
    public static getInstance(): ParticleEffectManager {
        if (!ParticleEffectManager.instance) {
            ParticleEffectManager.instance = new ParticleEffectManager();
        }
        return ParticleEffectManager.instance;
    }

    /**
     * Initialize with scene
     */
    public initialize(scene: Scene): void {
        this.scene = scene;
        console.log('ParticleEffectManager initialized');
    }

    /**
     * Get or create a particle effect from the pool
     */
    public getEffect<T extends PoolableEffect>(
        EffectClass: new (scene: Scene, ...args: any[]) => T
    ): T {
        const typeName = EffectClass.name;

        // Initialize pools if needed
        if (!this.effectPools.has(typeName)) {
            this.effectPools.set(typeName, []);
        }
        if (!this.activeEffects.has(typeName)) {
            this.activeEffects.set(typeName, []);
        }

        const pool = this.effectPools.get(typeName)!;
        const active = this.activeEffects.get(typeName)!;

        let effect: T;

        // Try to get from pool first
        if (pool.length > 0) {
            effect = pool.pop() as T;
            console.log(`Reusing ${typeName} from pool (${pool.length} remaining)`);
        } else {
            // Check if we've hit the active limit
            if (active.length >= this.maxActivePerType) {
                // Recycle the oldest active effect
                const oldest = active.shift() as T;
                oldest.reset();
                effect = oldest;
                console.log(`Recycling oldest ${typeName} (hit limit of ${this.maxActivePerType})`);
            } else {
                // Create new effect
                effect = new EffectClass(this.scene);
                console.log(`Created new ${typeName} (${active.length + 1}/${this.maxActivePerType})`);
            }
        }

        // Add to active list
        active.push(effect);

        return effect;
    }

    /**
     * Recycle an effect back to the pool
     */
    public recycleEffect(effect: PoolableEffect): void {
        const typeName = effect.constructor.name;

        // Initialize arrays if needed
        if (!this.effectPools.has(typeName)) {
            this.effectPools.set(typeName, []);
        }
        if (!this.activeEffects.has(typeName)) {
            this.activeEffects.set(typeName, []);
        }

        const pool = this.effectPools.get(typeName)!;
        const active = this.activeEffects.get(typeName)!;

        // Remove from active list
        const index = active.indexOf(effect);
        if (index !== -1) {
            active.splice(index, 1);
        }

        // Reset the effect
        effect.reset();

        // Add to pool if not at capacity
        if (pool.length < this.maxPoolSize) {
            pool.push(effect);
            console.log(`Recycled ${typeName} to pool (${pool.length}/${this.maxPoolSize})`);
        } else {
            // Pool is full, dispose
            effect.dispose();
            console.log(`Disposed ${typeName} (pool full)`);
        }
    }

    /**
     * Update all active effects
     */
    public update(deltaTime: number): void {
        const toRecycle: PoolableEffect[] = [];

        // Update and check all active effects
        this.activeEffects.forEach((effects) => {
            effects.forEach((effect) => {
                effect.update(deltaTime);

                // Check if should be recycled
                if (!effect.checkActive()) {
                    toRecycle.push(effect);
                }
            });
        });

        // Recycle inactive effects
        toRecycle.forEach((effect) => {
            this.recycleEffect(effect);
        });
    }

    /**
     * Clear all effects
     */
    public clearAll(): void {
        // Dispose all active effects
        this.activeEffects.forEach((effects) => {
            effects.forEach((effect) => effect.dispose());
        });

        // Dispose all pooled effects
        this.effectPools.forEach((effects) => {
            effects.forEach((effect) => effect.dispose());
        });

        // Clear maps
        this.activeEffects.clear();
        this.effectPools.clear();

        console.log('ParticleEffectManager cleared all effects');
    }

    /**
     * Get statistics
     */
    public getStats(): { type: string; active: number; pooled: number }[] {
        const stats: { type: string; active: number; pooled: number }[] = [];

        const allTypes = new Set([
            ...this.activeEffects.keys(),
            ...this.effectPools.keys()
        ]);

        allTypes.forEach((type) => {
            stats.push({
                type,
                active: this.activeEffects.get(type)?.length || 0,
                pooled: this.effectPools.get(type)?.length || 0
            });
        });

        return stats;
    }

    /**
     * Set max pool size per effect type
     */
    public setMaxPoolSize(size: number): void {
        this.maxPoolSize = Math.max(1, size);
    }

    /**
     * Set max active effects per type
     */
    public setMaxActivePerType(count: number): void {
        this.maxActivePerType = Math.max(1, count);
    }

    /**
     * Get scene reference
     */
    public getScene(): Scene {
        return this.scene;
    }
}
