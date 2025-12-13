import GameObject from '../objects/GameObject';

/**
 * Base interface for all components
 * Components are composable pieces of functionality that can be attached to GameObjects
 */
export interface Component {
    /**
     * Initialize the component with a reference to the owning GameObject
     * @param owner The GameObject that owns this component
     */
    initialize(owner: GameObject): void;

    /**
     * Update the component each frame
     * @param deltaTime Time elapsed since last frame in seconds
     */
    update?(deltaTime: number): void;

    /**
     * Clean up resources when component is removed
     */
    cleanup?(): void;
}

/**
 * Component manager for GameObject
 * Handles adding, removing, and updating components
 */
export class ComponentManager {
    private components: Map<string, Component> = new Map();
    private owner: GameObject;

    constructor(owner: GameObject) {
        this.owner = owner;
    }

    /**
     * Add a component to the GameObject
     * @param name Unique identifier for the component
     * @param component Component instance to add
     */
    public addComponent(name: string, component: Component): void {
        if (this.components.has(name)) {
            console.warn(`Component ${name} already exists on this GameObject`);
            return;
        }

        component.initialize(this.owner);
        this.components.set(name, component);
    }

    /**
     * Get a component by name
     * @param name Component identifier
     * @returns Component instance or undefined
     */
    public getComponent<T extends Component>(name: string): T | undefined {
        return this.components.get(name) as T | undefined;
    }

    /**
     * Check if a component exists
     * @param name Component identifier
     */
    public hasComponent(name: string): boolean {
        return this.components.has(name);
    }

    /**
     * Remove a component
     * @param name Component identifier
     */
    public removeComponent(name: string): void {
        const component = this.components.get(name);
        if (component && component.cleanup) {
            component.cleanup();
        }
        this.components.delete(name);
    }

    /**
     * Update all components
     * @param deltaTime Time elapsed since last frame
     */
    public updateAll(deltaTime: number): void {
        for (const component of this.components.values()) {
            if (component.update) {
                component.update(deltaTime);
            }
        }
    }

    /**
     * Clean up all components
     */
    public cleanupAll(): void {
        for (const component of this.components.values()) {
            if (component.cleanup) {
                component.cleanup();
            }
        }
        this.components.clear();
    }
}
