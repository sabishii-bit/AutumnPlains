import type { Scene } from '@babylonjs/core';
import { Entity } from './Entity';

/**
 * Manages all entities in the game
 * Singleton pattern for global entity management
 */
export class EntityManager {
    private static instance: EntityManager | null = null;
    private entities: Map<string, Entity> = new Map();
    private scene: Scene;

    private constructor(scene: Scene) {
        this.scene = scene;
    }

    public static initialize(scene: Scene): EntityManager {
        if (!EntityManager.instance) {
            EntityManager.instance = new EntityManager(scene);
        }
        return EntityManager.instance;
    }

    public static getInstance(): EntityManager {
        if (!EntityManager.instance) {
            throw new Error('EntityManager not initialized. Call initialize() first.');
        }
        return EntityManager.instance;
    }

    /**
     * Create a new entity
     */
    public createEntity(name: string = 'Entity'): Entity {
        const entity = new Entity(this.scene, name);
        this.entities.set(entity.id, entity);
        return entity;
    }

    /**
     * Get an entity by ID
     */
    public getEntity(id: string): Entity | null {
        return this.entities.get(id) || null;
    }

    /**
     * Remove and dispose an entity
     */
    public removeEntity(id: string): boolean {
        const entity = this.entities.get(id);
        if (entity) {
            entity.dispose();
            this.entities.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Update all entities
     */
    public update(deltaTime: number): void {
        for (const entity of this.entities.values()) {
            entity.update(deltaTime);
        }
    }

    /**
     * Get all entities
     */
    public getAllEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    /**
     * Clear all entities
     */
    public clear(): void {
        for (const entity of this.entities.values()) {
            entity.dispose();
        }
        this.entities.clear();
    }

    /**
     * Destroy the singleton instance
     */
    public static destroy(): void {
        if (EntityManager.instance) {
            EntityManager.instance.clear();
            EntityManager.instance = null;
        }
    }
}
