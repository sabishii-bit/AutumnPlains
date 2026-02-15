import { AssetContainer, Scene } from '@babylonjs/core';

/**
 * Global registry for managing loaded AssetContainers
 * Prevents duplicate loading of the same model and provides efficient reuse
 */
export class ModelRegistry {
    private static instance: ModelRegistry;
    private containers: Map<string, AssetContainer>;
    private loadingPromises: Map<string, Promise<AssetContainer>>;

    private constructor() {
        this.containers = new Map();
        this.loadingPromises = new Map();
    }

    public static getInstance(): ModelRegistry {
        if (!ModelRegistry.instance) {
            ModelRegistry.instance = new ModelRegistry();
        }
        return ModelRegistry.instance;
    }

    /**
     * Get an AssetContainer by path, returns undefined if not loaded
     */
    public getContainer(path: string): AssetContainer | undefined {
        return this.containers.get(path);
    }

    /**
     * Check if a model is already loaded
     */
    public hasContainer(path: string): boolean {
        return this.containers.has(path);
    }

    /**
     * Check if a model is currently being loaded
     */
    public isLoading(path: string): boolean {
        return this.loadingPromises.has(path);
    }

    /**
     * Get the loading promise for a model that's currently being loaded
     */
    public getLoadingPromise(path: string): Promise<AssetContainer> | undefined {
        return this.loadingPromises.get(path);
    }

    /**
     * Register a loading promise for a model
     */
    public registerLoadingPromise(path: string, promise: Promise<AssetContainer>): void {
        this.loadingPromises.set(path, promise);
    }

    /**
     * Register a loaded AssetContainer
     */
    public registerContainer(path: string, container: AssetContainer): void {
        this.containers.set(path, container);
        this.loadingPromises.delete(path); // Clear loading promise
        console.log(`[ModelRegistry] Registered model: ${path}`);
    }

    /**
     * Remove a container from the registry and dispose it
     */
    public disposeContainer(path: string): void {
        const container = this.containers.get(path);
        if (container) {
            container.dispose();
            this.containers.delete(path);
            console.log(`[ModelRegistry] Disposed model: ${path}`);
        }
    }

    /**
     * Clear all containers and dispose them
     */
    public clearAll(): void {
        this.containers.forEach((container, path) => {
            container.dispose();
            console.log(`[ModelRegistry] Disposed model: ${path}`);
        });
        this.containers.clear();
        this.loadingPromises.clear();
    }

    /**
     * Get stats about loaded models
     */
    public getStats(): { loaded: number; loading: number } {
        return {
            loaded: this.containers.size,
            loading: this.loadingPromises.size
        };
    }
}
