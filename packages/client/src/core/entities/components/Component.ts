import type { Entity } from '../Entity';

/**
 * Base component interface for ECS architecture
 * Components contain data and behavior that can be attached to entities
 */
export interface IComponent {
    /**
     * Called when the component is added to an entity
     */
    onAttach(entity: Entity): void;

    /**
     * Called every frame to update component logic
     */
    onUpdate(deltaTime: number): void;

    /**
     * Called when the component is removed from an entity
     */
    onDetach(): void;

    /**
     * Get the entity this component is attached to
     */
    getEntity(): Entity | null;
}

/**
 * Abstract base class for components
 */
export abstract class Component implements IComponent {
    protected entity: Entity | null = null;

    public onAttach(entity: Entity): void {
        this.entity = entity;
    }

    public onUpdate(deltaTime: number): void {
        // Override in derived classes
    }

    public onDetach(): void {
        this.entity = null;
    }

    public getEntity(): Entity | null {
        return this.entity;
    }
}
