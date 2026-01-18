import { Scene, AssetContainer, SceneLoader, Vector3, InstantiatedEntries, TransformNode } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { ModelRegistry } from './ModelRegistry';

export interface ModelLoadOptions {
    /** Position to place the instantiated model */
    position?: Vector3;
    /** Scale to apply to the instantiated model */
    scale?: Vector3;
    /** Rotation in radians (x, y, z) */
    rotation?: Vector3;
    /** Whether to enable shadows on the model */
    enableShadows?: boolean;
    /** Name prefix for the instantiated model */
    namePrefix?: string;
}

/**
 * Service for loading and instantiating 3D models using Babylon.js AssetContainers
 * Provides efficient model reuse through caching and optimized instancing
 */
export class ModelLoaderService {
    private scene: Scene;
    private registry: ModelRegistry;

    constructor(scene: Scene) {
        this.scene = scene;
        this.registry = ModelRegistry.getInstance();
    }

    /**
     * Load a model into an AssetContainer (async)
     * If already loaded, returns the cached container
     * If currently loading, waits for the existing load operation
     */
    public async loadModelAsync(modelPath: string): Promise<AssetContainer> {
        // Check if already loaded
        const existingContainer = this.registry.getContainer(modelPath);
        if (existingContainer) {
            console.log(`[ModelLoader] Using cached model: ${modelPath}`);
            return existingContainer;
        }

        // Check if currently loading
        const loadingPromise = this.registry.getLoadingPromise(modelPath);
        if (loadingPromise) {
            console.log(`[ModelLoader] Waiting for model to finish loading: ${modelPath}`);
            return loadingPromise;
        }

        // Start loading
        console.log(`[ModelLoader] Loading model: ${modelPath}`);
        const promise = SceneLoader.LoadAssetContainerAsync(
            '',
            modelPath,
            this.scene
        ).then((container) => {
            // Register the loaded container
            this.registry.registerContainer(modelPath, container);
            return container;
        }).catch((error) => {
            // Remove from loading promises on error
            this.registry.getLoadingPromise(modelPath);
            console.error(`[ModelLoader] Failed to load model ${modelPath}:`, error);
            throw error;
        });

        // Register the loading promise
        this.registry.registerLoadingPromise(modelPath, promise);

        return promise;
    }

    /**
     * Instantiate a model from a loaded AssetContainer
     * Creates a new instance without reloading the model
     */
    public instantiateModel(
        modelPath: string,
        options: ModelLoadOptions = {}
    ): InstantiatedEntries | null {
        const container = this.registry.getContainer(modelPath);
        if (!container) {
            console.error(`[ModelLoader] Model not loaded: ${modelPath}. Call loadModelAsync first.`);
            return null;
        }

        // Instantiate the model
        const entries = container.instantiateModelsToScene(
            name => options.namePrefix ? `${options.namePrefix}_${name}` : name,
            false, // Don't clone materials (share them for better performance)
            { doNotInstantiate: false }
        );

        // Apply transformations to the root node (cast to TransformNode for position/rotation/scaling)
        if (entries.rootNodes.length > 0) {
            const root = entries.rootNodes[0] as TransformNode;

            if (options.position) {
                root.position = options.position.clone();
            }

            if (options.scale) {
                root.scaling = options.scale.clone();
            }

            if (options.rotation) {
                root.rotation = options.rotation.clone();
            }
        }

        // Enable shadows if requested
        if (options.enableShadows) {
            entries.rootNodes.forEach(node => {
                node.getChildMeshes().forEach(mesh => {
                    mesh.receiveShadows = true;
                });
            });
        }

        console.log(`[ModelLoader] Instantiated model: ${modelPath}`);
        return entries;
    }

    /**
     * Load and instantiate a model in one call (convenience method)
     */
    public async loadAndInstantiateAsync(
        modelPath: string,
        options: ModelLoadOptions = {}
    ): Promise<InstantiatedEntries | null> {
        await this.loadModelAsync(modelPath);
        return this.instantiateModel(modelPath, options);
    }

    /**
     * Preload a model without instantiating it
     * Useful for loading screens or preloading assets
     */
    public async preloadModelAsync(modelPath: string): Promise<void> {
        await this.loadModelAsync(modelPath);
    }

    /**
     * Preload multiple models in parallel
     */
    public async preloadModelsAsync(modelPaths: string[]): Promise<void> {
        await Promise.all(modelPaths.map(path => this.preloadModelAsync(path)));
    }

    /**
     * Check if a model is loaded and ready to instantiate
     */
    public isModelLoaded(modelPath: string): boolean {
        return this.registry.hasContainer(modelPath);
    }

    /**
     * Check if a model is currently being loaded
     */
    public isModelLoading(modelPath: string): boolean {
        return this.registry.isLoading(modelPath);
    }

    /**
     * Get loading stats
     */
    public getStats(): { loaded: number; loading: number } {
        return this.registry.getStats();
    }

    /**
     * Dispose a loaded model and free its resources
     */
    public disposeModel(modelPath: string): void {
        this.registry.disposeContainer(modelPath);
    }

    /**
     * Clear all loaded models
     */
    public clearAll(): void {
        this.registry.clearAll();
    }
}
