import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { SceneContext } from '../../global/scene/SceneContext';
import { WorldContext } from '../../global/world/WorldContext';

interface CachedModel {
    scene: THREE.Group;
    timestamp: number;
}

export class ImportedModelLoaderService {
    private gltfLoader: GLTFLoader;
    private objLoader: OBJLoader;
    private mtlLoader: MTLLoader;
    
    // Cache storage
    private modelCache: Map<string, CachedModel>;
    private materialCache: Map<string, MTLLoader.MaterialCreator>;
    
    // Cache configuration
    private cacheEnabled: boolean = true;
    private cacheSizeLimit: number = 50; // Maximum number of models to cache
    private cacheExpiryTimeMs: number = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.objLoader = new OBJLoader();
        this.mtlLoader = new MTLLoader();
        this.modelCache = new Map<string, CachedModel>();
        this.materialCache = new Map<string, MTLLoader.MaterialCreator>();
        
        // Set up the GLTF loader to use caching for textures
        THREE.Cache.enabled = true;
    }
    
    // Configuration methods for cache settings
    public enableCache(enabled: boolean): void {
        this.cacheEnabled = enabled;
        THREE.Cache.enabled = enabled;
    }
    
    public setCacheSizeLimit(limit: number): void {
        this.cacheSizeLimit = limit;
    }
    
    public setCacheExpiryTime(milliseconds: number): void {
        this.cacheExpiryTimeMs = milliseconds;
    }
    
    public clearCache(): void {
        this.modelCache.clear();
        this.materialCache.clear();
        THREE.Cache.clear(); // Clear the THREE.js texture cache
    }

    public loadObjModel(mtlPath: string, objPath: string, position: THREE.Vector3, scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)): void {
        const cacheKey = `${objPath}|${mtlPath}`;
        
        // Check if the model is already in cache
        if (this.cacheEnabled && this.modelCache.has(cacheKey)) {
            const cachedModel = this.modelCache.get(cacheKey)!;
            
            // Update the timestamp to mark it as recently used
            cachedModel.timestamp = Date.now();
            
            // Clone the cached scene
            const clonedScene = this.cloneModel(cachedModel.scene);
            clonedScene.position.copy(position);
            clonedScene.scale.copy(scale);
            
            SceneContext.getInstance().add(clonedScene);
            console.log(`Using cached model: ${objPath}`);
            return;
        }
        
        // Check if the material is already in cache
        if (this.cacheEnabled && this.materialCache.has(mtlPath)) {
            const cachedMaterial = this.materialCache.get(mtlPath)!;
            this.objLoader.setMaterials(cachedMaterial);
            
            this.objLoader.load(objPath, (root) => {
                root.position.copy(position);
                root.scale.copy(scale);
                
                // Store model in cache
                if (this.cacheEnabled) {
                    this.ensureCacheSizeLimit();
                    this.modelCache.set(cacheKey, {
                        scene: root.clone(),
                        timestamp: Date.now()
                    });
                }
                
                SceneContext.getInstance().add(root);
            });
            return;
        }
        
        // Load normally if not cached
        this.mtlLoader.load(mtlPath, (mtl) => {
            mtl.preload();
            this.objLoader.setMaterials(mtl);
            
            // Cache the material
            if (this.cacheEnabled) {
                this.materialCache.set(mtlPath, mtl);
            }
            
            this.objLoader.load(objPath, (root) => {
                root.position.copy(position);
                root.scale.copy(scale);
                
                // Store model in cache
                if (this.cacheEnabled) {
                    this.ensureCacheSizeLimit();
                    this.modelCache.set(cacheKey, {
                        scene: root.clone(),
                        timestamp: Date.now()
                    });
                }
                
                SceneContext.getInstance().add(root);
            });
        });
    }

    public loadGltfModel(
        gltfPath: string, 
        position: THREE.Vector3, 
        trimeshCollisionEnabled: boolean = false, 
        scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
        physicsBody: CANNON.Body | null = null
    ): void {
        const cacheKey = gltfPath;
        
        // Check if the model is already in cache
        if (this.cacheEnabled && this.modelCache.has(cacheKey)) {
            const cachedModel = this.modelCache.get(cacheKey)!;
            
            // Update the timestamp to mark it as recently used
            cachedModel.timestamp = Date.now();
            
            // Clone the cached scene
            const clonedScene = this.cloneModel(cachedModel.scene);
            clonedScene.position.copy(position);
            clonedScene.scale.copy(scale);
            
            SceneContext.getInstance().add(clonedScene);
            
            // Create a CANNON.Trimesh for physics if enabled
            if (trimeshCollisionEnabled) {
                this.createTrimeshPhysics(clonedScene, position, scale, physicsBody);
            }
            
            console.log(`Using cached model: ${gltfPath}`);
            return;
        }
        
        // Load normally if not cached
        this.gltfLoader.load(
            gltfPath,
            (gltf) => {
                // Process the model
                this.processGltfModel(gltf, position, scale, trimeshCollisionEnabled, physicsBody);
                
                // Store in cache
                if (this.cacheEnabled) {
                    this.ensureCacheSizeLimit();
                    this.modelCache.set(cacheKey, {
                        scene: gltf.scene.clone(),
                        timestamp: Date.now()
                    });
                }
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error happened during loading: ' + error);
            }
        );
    }
    
    // Helper to process GLTF model (used by both cached and non-cached paths)
    private processGltfModel(
        gltf: GLTF,
        position: THREE.Vector3,
        scale: THREE.Vector3,
        trimeshCollisionEnabled: boolean,
        physicsBody: CANNON.Body | null
    ): void {
        // Traverse the model to enable shadows and set up materials
        gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const mesh = child as THREE.Mesh;
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

                materials.forEach((material) => {
                    // Ensure the material is compatible with shadows
                    if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshLambertMaterial) {
                        // These materials are already shadow-compatible
                    } else if (material instanceof THREE.MeshBasicMaterial) {
                        // Convert to a standard material that supports shadows
                        mesh.material = new THREE.MeshStandardMaterial({
                            map: material.map,
                            color: material.color
                        });
                    } else {
                        // Default to a basic shadow-compatible material
                        mesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
                    }
                });

                // Enable shadow casting and receiving
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });

        gltf.scene.position.copy(position);
        gltf.scene.scale.copy(scale);
        SceneContext.getInstance().add(gltf.scene);

        // Create a CANNON.Trimesh for physics if enabled
        if (trimeshCollisionEnabled) {
            this.createTrimeshPhysics(gltf.scene, position, scale, physicsBody);
        }
    }

    private createTrimeshPhysics(
        scene: THREE.Group, 
        position: THREE.Vector3, 
        scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
        physicsBody: CANNON.Body | null = null
    ): void {
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;
                const vertices = geometry.attributes.position.array;
                const indices = geometry.index ? geometry.index.array : [];

                const cannonShape = new CANNON.Trimesh(
                    Array.from(vertices),
                    Array.from(indices)
                );
                
                // Apply scale to the physics shape
                cannonShape.setScale(new CANNON.Vec3(scale.x, scale.y, scale.z));

                let cannonBody: CANNON.Body;
                if (physicsBody) {
                    cannonBody = physicsBody;
                    cannonBody.position = new CANNON.Vec3(position.x, position.y, position.z);
                } else {
                    cannonBody = new CANNON.Body({
                        mass: 0, // Static body
                        position: new CANNON.Vec3(position.x, position.y, position.z)
                    });
                }

                cannonBody.addShape(cannonShape);

                WorldContext.getInstance().addBody(cannonBody);
            }
        });
    }
    
    // Helper to ensure the cache doesn't exceed size limits by removing least recently used items
    private ensureCacheSizeLimit(): void {
        if (this.modelCache.size >= this.cacheSizeLimit) {
            // Find the oldest entries to remove
            const currentTime = Date.now();
            const entries = Array.from(this.modelCache.entries());
            
            // Sort by timestamp (oldest first)
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            // Also check for expired entries
            entries.forEach(([key, model]) => {
                if (currentTime - model.timestamp > this.cacheExpiryTimeMs) {
                    this.modelCache.delete(key);
                }
            });
            
            // If still over limit, remove oldest
            if (this.modelCache.size >= this.cacheSizeLimit) {
                const oldestKey = entries[0][0];
                this.modelCache.delete(oldestKey);
            }
        }
    }
    
    // Helper method to properly clone a model
    private cloneModel(original: THREE.Group): THREE.Group {
        const clone = original.clone();
        
        // Handle materials properly during cloning
        const sourceMaterials = new Map<string, THREE.Material>();
        original.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const meshObject = object as THREE.Mesh;
                if (Array.isArray(meshObject.material)) {
                    meshObject.material.forEach((mat) => {
                        sourceMaterials.set(mat.uuid, mat);
                    });
                } else {
                    sourceMaterials.set(meshObject.material.uuid, meshObject.material);
                }
            }
        });
        
        // Now copy materials to clone
        clone.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                const meshObject = object as THREE.Mesh;
                if (Array.isArray(meshObject.material)) {
                    meshObject.material = meshObject.material.map(mat => {
                        const sourceMat = sourceMaterials.get(mat.uuid);
                        return sourceMat ? sourceMat.clone() : mat;
                    });
                } else {
                    const sourceMat = sourceMaterials.get(meshObject.material.uuid);
                    if (sourceMat) {
                        meshObject.material = sourceMat.clone();
                    }
                }
            }
        });
        
        return clone;
    }
    
    // Method to preload models without adding them to the scene
    public preloadGltfModel(gltfPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.cacheEnabled && this.modelCache.has(gltfPath)) {
                resolve(); // Already cached
                return;
            }
            
            this.gltfLoader.load(
                gltfPath,
                (gltf) => {
                    // Process the model for caching but don't add to scene
                    gltf.scene.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            const mesh = child as THREE.Mesh;
                            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                            
                            materials.forEach((material) => {
                                if (material instanceof THREE.MeshBasicMaterial) {
                                    mesh.material = new THREE.MeshStandardMaterial({
                                        map: material.map,
                                        color: material.color
                                    });
                                }
                            });
                            
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                        }
                    });
                    
                    // Store in cache
                    if (this.cacheEnabled) {
                        this.ensureCacheSizeLimit();
                        this.modelCache.set(gltfPath, {
                            scene: gltf.scene,
                            timestamp: Date.now()
                        });
                    }
                    
                    resolve();
                },
                undefined,
                reject
            );
        });
    }
    
    // Method to dispose models and free resources
    public disposeModel(model: THREE.Group): void {
        model.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}
