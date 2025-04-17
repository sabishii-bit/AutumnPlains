import * as THREE from 'three';
import BaseProjectile from './BaseProjectile';
import { TestProjectile } from './TestProjectile';
import { ProjectileFactory } from './ProjectileFactory';
import { GameObjectManager } from '../../../entities/GameObjectManager';

/**
 * Manages the lifecycle of projectiles, including creation, firing, and cleanup
 */
export class ProjectileManager {
    private static instance: ProjectileManager;
    private projectileFactory: ProjectileFactory;
    private gameObjectManager: GameObjectManager;
    
    // Maps to track active and pooled projectiles by type
    private activeProjectiles: Map<string, BaseProjectile[]> = new Map();
    private projectilePool: Map<string, BaseProjectile[]> = new Map();
    
    // Maximum projectiles allowed per type
    private maxProjectilesPerType: number = 20;
    
    private constructor() {
        this.projectileFactory = ProjectileFactory.getInstance();
        this.gameObjectManager = GameObjectManager.getInstance();
    }
    
    /**
     * Get the singleton instance of ProjectileManager
     */
    public static getInstance(): ProjectileManager {
        if (!ProjectileManager.instance) {
            ProjectileManager.instance = new ProjectileManager();
        }
        return ProjectileManager.instance;
    }
    
    /**
     * Creates or retrieves a TestProjectile and fires it
     * @returns The fired projectile
     */
    public fireTestProjectile(): TestProjectile {
        // Get or create a test projectile
        const projectile = this.getProjectile('TestProjectile') as TestProjectile;
        
        // Fire the projectile
        projectile.fire();
        
        return projectile;
    }
    
    /**
     * Generic method to fire any type of projectile
     * @param type The class type of the projectile to fire
     * @returns The fired projectile
     */
    public fireProjectile<T extends BaseProjectile>(type: new (...args: any[]) => T): T {
        const typeName = type.name;
        const projectile = this.getProjectile(typeName) as T;
        
        // Fire the projectile
        if ('fire' in projectile && typeof projectile.fire === 'function') {
            projectile.fire();
        } else {
            console.error(`Projectile of type ${typeName} does not have a fire() method`);
        }
        
        return projectile;
    }
    
    /**
     * Gets a projectile from the pool or creates a new one if needed
     * @param typeName The name of the projectile type
     * @returns A projectile instance ready to use
     */
    private getProjectile(typeName: string): BaseProjectile {
        // Initialize pool array for this type if it doesn't exist
        if (!this.projectilePool.has(typeName)) {
            this.projectilePool.set(typeName, []);
        }
        
        // Initialize active array for this type if it doesn't exist
        if (!this.activeProjectiles.has(typeName)) {
            this.activeProjectiles.set(typeName, []);
        }
        
        const pool = this.projectilePool.get(typeName)!;
        const active = this.activeProjectiles.get(typeName)!;
        
        let projectile: BaseProjectile;
        
        // Check if we have any available in the pool
        if (pool.length > 0) {
            // Reuse a projectile from the pool
            projectile = pool.pop()!;
            console.log(`Reusing ${typeName} from pool`);
        } else {
            // Create a new projectile if we haven't reached the limit
            if (active.length < this.maxProjectilesPerType) {
                if (typeName === 'TestProjectile') {
                    projectile = this.projectileFactory.createTestProjectile();
                } else {
                    // For other types, use the generic method
                    // This is a simplification - in practice you'd need a way to map type names to actual classes
                    console.error(`Unknown projectile type: ${typeName}`);
                    projectile = this.projectileFactory.createTestProjectile(); // Fallback to test projectile
                }
                console.log(`Created new ${typeName}`);
            } else {
                // If we've reached the limit, recycle the oldest active projectile
                projectile = active.shift()!;
                console.log(`Recycled oldest active ${typeName} (reached limit of ${this.maxProjectilesPerType})`);
            }
        }
        
        // Add to active projectiles
        active.push(projectile);
        
        return projectile;
    }
    
    /**
     * Returns a projectile to the pool
     * @param projectile The projectile to return to the pool
     */
    public recycleProjectile(projectile: BaseProjectile): void {
        const typeName = projectile.constructor.name;
        
        // Initialize arrays if needed
        if (!this.activeProjectiles.has(typeName)) {
            this.activeProjectiles.set(typeName, []);
        }
        if (!this.projectilePool.has(typeName)) {
            this.projectilePool.set(typeName, []);
        }
        
        const active = this.activeProjectiles.get(typeName)!;
        const pool = this.projectilePool.get(typeName)!;
        
        // Remove from active array
        const index = active.indexOf(projectile);
        if (index !== -1) {
            active.splice(index, 1);
        }
        
        // Reset the projectile for reuse
        projectile.reset();
        
        // Deactivate the projectile (this might be redundant now with reset)
        if ('deactivate' in projectile && typeof (projectile as any).deactivate === 'function') {
            (projectile as any).deactivate();
        }
        
        // Add to pool
        pool.push(projectile);
        
        console.log(`Recycled ${typeName} back to pool`);
    }
    
    /**
     * Updates all active projectiles and recycles finished ones
     * @param deltaTime Time elapsed since last update
     */
    public update(deltaTime: number): void {
        // Iterate through each projectile type
        this.activeProjectiles.forEach((projectiles, typeName) => {
            // Create a list to track projectiles to recycle
            const toRecycle: BaseProjectile[] = [];
            
            // Update each projectile
            projectiles.forEach(projectile => {
                // Check if projectile is active
                let isStillActive = false;
                
                // Different check method depending on projectile type
                if (projectile instanceof TestProjectile) {
                    isStillActive = projectile.checkActive();
                } else {
                    // Default fallback - assume active
                    isStillActive = true;
                }
                
                // If no longer active, mark for recycling
                if (!isStillActive) {
                    toRecycle.push(projectile);
                }
            });
            
            // Recycle projectiles that are done
            toRecycle.forEach(projectile => {
                this.recycleProjectile(projectile);
            });
        });
    }
    
    /**
     * Cleans up all projectiles, recycling active ones and clearing the pool
     */
    public cleanup(): void {
        // Recycle all active projectiles
        this.activeProjectiles.forEach((projectiles, typeName) => {
            // Clone the array since we're modifying it during iteration
            [...projectiles].forEach(projectile => {
                this.recycleProjectile(projectile);
            });
        });
        
        // Clear the pool
        this.projectilePool.clear();
        this.activeProjectiles.clear();
        
        console.log('ProjectileManager cleaned up all projectiles');
    }
    
    /**
     * Sets the maximum number of projectiles allowed per type
     * @param max The maximum number of projectiles
     */
    public setMaxProjectilesPerType(max: number): void {
        if (max > 0) {
            this.maxProjectilesPerType = max;
        }
    }
} 