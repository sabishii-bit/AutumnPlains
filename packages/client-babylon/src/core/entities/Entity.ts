import { Scene, TransformNode } from '@babylonjs/core';
import type { IComponent } from './components/Component';

/**
 * Entity class for ECS architecture
 * Entities are containers for components and have a transform in the scene
 */
export class Entity {
    private components: Map<string, IComponent> = new Map();
    private transformNode: TransformNode;
    private scene: Scene;
    private active: boolean = true;
    public readonly id: string;

    constructor(scene: Scene, name: string = 'Entity') {
        this.scene = scene;
        this.id = crypto.randomUUID();
        this.transformNode = new TransformNode(name, scene);
        this.transformNode.id = this.id;
    }

    /**
     * Add a component to this entity
     */
    public addComponent<T extends IComponent>(name: string, component: T): T {
        if (this.components.has(name)) {
            console.warn(`Component ${name} already exists on entity ${this.id}`);
            return this.components.get(name) as T;
        }

        this.components.set(name, component);
        component.onAttach(this);
        return component;
    }

    /**
     * Get a component by name
     */
    public getComponent<T extends IComponent>(name: string): T | null {
        return (this.components.get(name) as T) || null;
    }

    /**
     * Check if entity has a component
     */
    public hasComponent(name: string): boolean {
        return this.components.has(name);
    }

    /**
     * Remove a component from this entity
     */
    public removeComponent(name: string): boolean {
        const component = this.components.get(name);
        if (component) {
            component.onDetach();
            this.components.delete(name);
            return true;
        }
        return false;
    }

    /**
     * Update all components
     */
    public update(deltaTime: number): void {
        if (!this.active) return;

        for (const component of this.components.values()) {
            component.onUpdate(deltaTime);
        }
    }

    /**
     * Get the transform node
     */
    public getTransformNode(): TransformNode {
        return this.transformNode;
    }

    /**
     * Get the scene this entity belongs to
     */
    public getScene(): Scene {
        return this.scene;
    }

    /**
     * Set active state
     */
    public setActive(active: boolean): void {
        this.active = active;
        this.transformNode.setEnabled(active);
    }

    /**
     * Get active state
     */
    public isActive(): boolean {
        return this.active;
    }

    /**
     * Dispose of this entity and all its components
     */
    public dispose(): void {
        for (const component of this.components.values()) {
            component.onDetach();
        }
        this.components.clear();
        this.transformNode.dispose();
    }
}
