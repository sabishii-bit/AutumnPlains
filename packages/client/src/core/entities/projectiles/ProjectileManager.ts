import { Scene } from '@babylonjs/core';

/**
 * Poolable projectile interface
 */
interface Poolable {
    reset(): void;
    checkActive(): boolean;
    update(deltaTime: number): void;
    dispose(): void;
}

/**
 * Manages projectile lifecycle with object pooling for performance
 * Singleton pattern ensures one manager per game instance
 */
export class ProjectileManager {
    private static instance: ProjectileManager;
    private scene!: Scene;

    // Pool management: type name -> array of projectiles
    private projectilePools: Map<string, Poolable[]> = new Map();
    private activeProjectiles: Map<string, Poolable[]> = new Map();

    // Configuration
    private maxPoolSize: number = 20; // Max pooled instances per type
    private maxActivePerType: number = 50; // Max active projectiles per type

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ProjectileManager {
        if (!ProjectileManager.instance) {
            ProjectileManager.instance = new ProjectileManager();
        }
        return ProjectileManager.instance;
    }

    /**
     * Initialize the manager with a scene
     */
    public initialize(scene: Scene): void {
        this.scene = scene;
        console.log('ProjectileManager initialized');
    }

    /**
     * Create or reuse a projectile from the pool
     */
    public getProjectile<T extends Poolable>(
        ProjectileClass: new (scene: Scene, ...args: any[]) => T
    ): T {
        const typeName = ProjectileClass.name;

        // Initialize pool if needed
        if (!this.projectilePools.has(typeName)) {
            this.projectilePools.set(typeName, []);
        }
        if (!this.activeProjectiles.has(typeName)) {
            this.activeProjectiles.set(typeName, []);
        }

        const pool = this.projectilePools.get(typeName)!;
        const active = this.activeProjectiles.get(typeName)!;

        let projectile: T;

        // Try to get from pool first
        if (pool.length > 0) {
            projectile = pool.pop() as T;
            console.log(`Reusing ${typeName} from pool (${pool.length} remaining)`);
        } else {
            // Check if we've hit the active limit
            if (active.length >= this.maxActivePerType) {
                // Recycle the oldest active projectile
                const oldest = active.shift() as T;
                oldest.reset();
                projectile = oldest;
                console.log(`Recycling oldest ${typeName} (hit limit of ${this.maxActivePerType})`);
            } else {
                // Create new projectile
                projectile = new ProjectileClass(this.scene);
                console.log(`Created new ${typeName} (${active.length + 1}/${this.maxActivePerType})`);
            }
        }

        // Add to active list
        active.push(projectile);

        return projectile;
    }

    /**
     * Return a projectile to the pool
     */
    public recycleProjectile(projectile: Poolable): void {
        const typeName = projectile.constructor.name;

        // Initialize arrays if needed
        if (!this.projectilePools.has(typeName)) {
            this.projectilePools.set(typeName, []);
        }
        if (!this.activeProjectiles.has(typeName)) {
            this.activeProjectiles.set(typeName, []);
        }

        const pool = this.projectilePools.get(typeName)!;
        const active = this.activeProjectiles.get(typeName)!;

        // Remove from active list
        const index = active.indexOf(projectile);
        if (index !== -1) {
            active.splice(index, 1);
        }

        // Reset the projectile
        projectile.reset();

        // Add to pool if not at capacity
        if (pool.length < this.maxPoolSize) {
            pool.push(projectile);
            console.log(`Recycled ${typeName} to pool (${pool.length}/${this.maxPoolSize})`);
        } else {
            // Pool is full, dispose of the projectile
            projectile.dispose();
            console.log(`Disposed ${typeName} (pool full)`);
        }
    }

    /**
     * Update all active projectiles
     * Call this each frame from your game loop
     */
    public update(deltaTime: number): void {
        const toRecycle: Poolable[] = [];

        // Check all active projectiles
        this.activeProjectiles.forEach((projectiles) => {
            projectiles.forEach((projectile) => {
                // Update the projectile
                projectile.update(deltaTime);

                // Check if it should be recycled
                if (!projectile.checkActive()) {
                    toRecycle.push(projectile);
                }
            });
        });

        // Recycle inactive projectiles
        toRecycle.forEach((projectile) => {
            this.recycleProjectile(projectile);
        });
    }

    /**
     * Clear all projectiles (active and pooled)
     */
    public clearAll(): void {
        // Dispose all active projectiles
        this.activeProjectiles.forEach((projectiles) => {
            projectiles.forEach((projectile) => {
                projectile.dispose();
            });
        });

        // Dispose all pooled projectiles
        this.projectilePools.forEach((projectiles) => {
            projectiles.forEach((projectile) => {
                projectile.dispose();
            });
        });

        // Clear maps
        this.activeProjectiles.clear();
        this.projectilePools.clear();

        console.log('ProjectileManager cleared all projectiles');
    }

    /**
     * Get statistics about projectiles
     */
    public getStats(): { type: string; active: number; pooled: number }[] {
        const stats: { type: string; active: number; pooled: number }[] = [];

        const allTypes = new Set([
            ...this.activeProjectiles.keys(),
            ...this.projectilePools.keys()
        ]);

        allTypes.forEach((type) => {
            stats.push({
                type,
                active: this.activeProjectiles.get(type)?.length || 0,
                pooled: this.projectilePools.get(type)?.length || 0
            });
        });

        return stats;
    }

    /**
     * Set maximum pool size per projectile type
     */
    public setMaxPoolSize(size: number): void {
        this.maxPoolSize = Math.max(1, size);
    }

    /**
     * Set maximum active projectiles per type
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
