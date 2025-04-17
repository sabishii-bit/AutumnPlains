import * as THREE from 'three';
import BaseProjectile from './BaseProjectile';
import { TestProjectile } from './TestProjectile';
import { GameObjectOptions } from '../GameObject';
import { GameObjectManager } from '../../../entities/GameObjectManager';

/**
 * Factory class responsible for creating and properly initializing different types of projectiles
 */
export class ProjectileFactory {
    private static instance: ProjectileFactory;
    private gameObjectManager: GameObjectManager;

    private constructor() {
        this.gameObjectManager = GameObjectManager.getInstance();
    }

    /**
     * Get the singleton instance of ProjectileFactory
     */
    public static getInstance(): ProjectileFactory {
        if (!ProjectileFactory.instance) {
            ProjectileFactory.instance = new ProjectileFactory();
        }
        return ProjectileFactory.instance;
    }

    /**
     * Creates a fully initialized TestProjectile
     * @param options Additional options for the projectile
     * @returns Fully initialized TestProjectile
     */
    public createTestProjectile(options: GameObjectOptions = {}): TestProjectile {
        // Ensure options are properly set for initialization
        const projectileOptions: GameObjectOptions = {
            ...options,
            // Prevent auto-adding to collection - we'll do this manually after initialization
            addToCollection: false
        };

        // Create the projectile instance
        const projectile = new TestProjectile(projectileOptions);
        
        // Force proper initialization sequence
        projectile.initialize();
        
        // Now manually add it to the collection
        this.gameObjectManager.addGameObject(projectile);
        
        console.log('TestProjectile created and fully initialized');
        
        return projectile;
    }
    
    /**
     * Generic method to create any type of projectile
     * @param type The projectile class to instantiate
     * @param options Additional options for the projectile
     * @returns Fully initialized projectile of the requested type
     */
    public createProjectile<T extends BaseProjectile>(
        type: new (options: GameObjectOptions) => T,
        options: GameObjectOptions = {}
    ): T {
        // Ensure options are properly set
        const projectileOptions: GameObjectOptions = {
            ...options,
            addToCollection: false
        };
        
        // Create the projectile instance
        const projectile = new type(projectileOptions);
        
        // If the projectile has an initialize method, call it
        if ('initialize' in projectile && typeof (projectile as any).initialize === 'function') {
            (projectile as any).initialize();
        }
        
        // Add to collection after initialization
        this.gameObjectManager.addGameObject(projectile);
        
        console.log(`${type.name} created and fully initialized`);
        
        return projectile;
    }
} 