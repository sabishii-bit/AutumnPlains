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

    // Scene and world context references
    private scene: THREE.Scene;
    private cannonWorld: CANNON.World;

    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.objLoader = new OBJLoader();
        this.mtlLoader = new MTLLoader();
        this.modelCache = new Map<string, CachedModel>();
        this.materialCache = new Map<string, MTLLoader.MaterialCreator>();
        
        // Set up the GLTF loader to use caching for textures
        THREE.Cache.enabled = true;

        // Get singleton instances
        this.scene = SceneContext.getInstance();
        this.cannonWorld = WorldContext.getInstance();
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
            
            this.scene.add(clonedScene);
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
                
                this.scene.add(root);
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
                
                this.scene.add(root);
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
            
            // Apply position and scale
            clonedScene.position.copy(position);
            clonedScene.scale.copy(scale);
            
            // Add to scene
            this.scene.add(clonedScene);
            
            // Force an update of the world matrix to ensure correct physics
            clonedScene.updateMatrixWorld(true);
            
            // Create a CANNON.Trimesh for physics if enabled
            if (trimeshCollisionEnabled) {
                // Create physics immediately instead of using setTimeout
                const createdBody = this.createTrimeshPhysics(clonedScene, position, scale, physicsBody);
                console.log(`Physics created for cached model at position (${position.x}, ${position.y}, ${position.z})`, createdBody);
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
                    
                    // Store the original unscaled model for flexible reuse with different scales
                    const originalScene = gltf.scene.clone();
                    originalScene.scale.set(1, 1, 1); // Reset to original scale
                    
                    this.modelCache.set(cacheKey, {
                        scene: originalScene,
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

        // Apply position and scale
        gltf.scene.position.copy(position);
        gltf.scene.scale.copy(scale);
        
        // Add to scene
        this.scene.add(gltf.scene);
        
        // Force an update of the world matrix to ensure correct physics
        gltf.scene.updateMatrixWorld(true);

        // Create a CANNON.Trimesh for physics if enabled
        if (trimeshCollisionEnabled) {
            // Create the physics immediately rather than with setTimeout
            // This ensures physics is applied properly when model is loaded
            const createdBody = this.createTrimeshPhysics(gltf.scene, position, scale, physicsBody);
            
            // Log successful physics creation for debugging
            console.log(`Physics created for model at position (${position.x}, ${position.y}, ${position.z})`, createdBody);
        }
    }

    /**
     * Create trimesh physics for a complex mesh
     * @param object The object to create physics for
     * @param position Base position for the object
     * @param scale Base scale for the object
     * @param physicsBody Optional existing physics body to use
     * @returns The created CANNON.js body
     */
    private createTrimeshPhysics(
        object: THREE.Object3D, 
        position: THREE.Vector3, 
        scale: THREE.Vector3, 
        physicsBody: CANNON.Body | null
    ): CANNON.Body {
        // Get the CANNON world
        const world = this.cannonWorld;
        
        // Use existing body or create new one
        let body = physicsBody || new CANNON.Body({ 
            mass: 0.0, // Use zero mass for static objects by default
            // Initialize position to match the object's position
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        
        // Track if we've added any shapes to the body
        let shapesAdded = false;
        
        // Process all mesh children
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Extract the mesh's world position, rotation, and scale
                const worldPosition = new THREE.Vector3();
                const worldQuaternion = new THREE.Quaternion();
                const worldScale = new THREE.Vector3();
                child.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
        
                // Clone the geometry to avoid modifying the original
                const geometry = child.geometry.clone();
                
                // Make sure the geometry's vertices reflect current transformations
                if (geometry.attributes.position) {
                    // Extract vertices and indices from the geometry
                    const vertices = Array.from(geometry.attributes.position.array as Float32Array) as number[];
                    
                    let indices: number[];
                    if (geometry.index) {
                        indices = Array.from(geometry.index.array as Uint16Array | Uint32Array) as number[];
                    } else {
                        // If no index, create one that just counts up (0,1,2,3,...)
                        indices = [];
                        for (let i = 0; i < vertices.length / 3; i++) {
                            indices.push(i);
                        }
                    }
        
                    // Create the CANNON.js trimesh shape
                    const cannonShape = new CANNON.Trimesh(vertices, indices);
                    
                    // Apply scale to the shape to match the Three.js mesh scale
                    cannonShape.setScale(new CANNON.Vec3(
                        Math.abs(worldScale.x),
                        Math.abs(worldScale.y),
                        Math.abs(worldScale.z)
                    ));
        
                    // Calculate the shape's position relative to the body's position
                    const relativePosition = new CANNON.Vec3(
                        worldPosition.x - position.x,
                        worldPosition.y - position.y, 
                        worldPosition.z - position.z
                    );
                    
                    // Create a quaternion that matches the mesh's orientation
                    const correctedQuaternion = new CANNON.Quaternion();
                    correctedQuaternion.set(
                        worldQuaternion.x,
                        worldQuaternion.y,
                        worldQuaternion.z,
                        worldQuaternion.w
                    );
                    
                    // Add the shape to the body with the corrected transforms
                    body.addShape(cannonShape, relativePosition, correctedQuaternion);
                    
                    // For debugging, log information about each added shape
                    console.log(`Added shape to physics body at relative position (${relativePosition.x}, ${relativePosition.y}, ${relativePosition.z})`);
                    
                    shapesAdded = true;
                    
                    // Always create wireframe for visualization, regardless of current visibility
                    // Initial visibility will be set based on ImportedModelLoaderService.isWireframeVisible
                    this.createMeshWireframe(
                        child as THREE.Mesh,
                        worldPosition,
                        worldScale,
                        worldQuaternion,
                        body
                    );
                }
            }
        });
        
        // If shapes were added, add the body to the CANNON world
        if (shapesAdded && !physicsBody) {
            world.addBody(body);
            console.log("Added physics body to world", body);
            
            // Normalize quaternion to prevent rotation drift
            body.quaternion.normalize();
        } else if (!shapesAdded) {
            console.warn("No valid meshes found for physics in the object:", object);
        }
        
        return body;
    }
    
    /**
     * Creates a wireframe representation of a box physics body for visualization
     * @param size Box dimensions
     * @param position Box position
     * @param physicsBody The physics body to visualize
     */
    private createBoxWireframe(size: THREE.Vector3, position: THREE.Vector3, physicsBody: CANNON.Body): void {
        // Create a box geometry matching the physics body
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const wireframe = new THREE.WireframeGeometry(geometry);
        const wireMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const wireframeMesh = new THREE.LineSegments(wireframe, wireMaterial);
        
        // Position the wireframe
        wireframeMesh.position.copy(position);
        
        // Add to scene with visibility set based on current state
        wireframeMesh.visible = ImportedModelLoaderService.isWireframeVisible;
        this.scene.add(wireframeMesh);
        
        // Store wireframe on the imported model registry
        this.registerWireframeForToggle(wireframeMesh, physicsBody);
    }
    
    /**
     * Creates a wireframe representation of a mesh's physics body for visualization
     */
    private createMeshWireframe(
        mesh: THREE.Mesh, 
        position: THREE.Vector3,
        scale: THREE.Vector3,
        quaternion: THREE.Quaternion,
        physicsBody: CANNON.Body
    ): void {
        // Create a wireframe from the mesh's geometry (using a clone to avoid modifying original)
        const clonedGeometry = mesh.geometry.clone();
        const wireframe = new THREE.WireframeGeometry(clonedGeometry);
        const wireMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            depthTest: false, // Make wireframe visible through objects
            opacity: 0.5,
            transparent: true
        });
        const wireframeMesh = new THREE.LineSegments(wireframe, wireMaterial);
        
        // Apply the same transformations
        wireframeMesh.position.copy(position);
        wireframeMesh.quaternion.copy(quaternion);
        wireframeMesh.scale.copy(scale);
        
        // Add to scene with visibility set based on current state
        wireframeMesh.visible = ImportedModelLoaderService.isWireframeVisible;
        wireframeMesh.renderOrder = 999; // Ensure wireframe renders on top
        this.scene.add(wireframeMesh);
        
        // Register wireframe for toggle with 'T' key
        this.registerWireframeForToggle(wireframeMesh, physicsBody);
    }
    
    /**
     * Registers a wireframe with the GameObject wireframe registry to toggle with 'T' key
     */
    private registerWireframeForToggle(wireframeMesh: THREE.LineSegments, physicsBody: CANNON.Body): void {
        // Special user data to identify this as a wireframe mesh for imported models
        wireframeMesh.userData.isImportedModelWireframe = true;
        wireframeMesh.userData.physicsBody = physicsBody;
        
        // Add to global wireframe collection for toggling
        ImportedModelLoaderService.wireframeMeshes.push(wireframeMesh);
        
        // Sync the wireframe with physics in the update loop
        this.registerPhysicsSync(wireframeMesh, physicsBody);
    }
    
    /**
     * Registers a callback to sync the wireframe with physics
     */
    private registerPhysicsSync(wireframeMesh: THREE.LineSegments, physicsBody: CANNON.Body): void {
        // Add to a list that will be updated each frame
        if (!ImportedModelLoaderService.physicsSyncList) {
            ImportedModelLoaderService.physicsSyncList = [];
        }
        
        ImportedModelLoaderService.physicsSyncList.push({
            mesh: wireframeMesh,
            body: physicsBody
        });
    }

    // Static wireframe registry for imported models
    private static wireframeMeshes: THREE.LineSegments[] = [];
    private static physicsSyncList: Array<{mesh: THREE.LineSegments, body: CANNON.Body}> = [];
    private static isWireframeVisible: boolean = false;

    /**
     * Toggle the visibility of all wireframes for imported models
     * Call this method when 'T' is pressed
     */
    public static toggleWireframeVisibility(): boolean {
        ImportedModelLoaderService.isWireframeVisible = !ImportedModelLoaderService.isWireframeVisible;
        
        ImportedModelLoaderService.wireframeMeshes.forEach(wireframe => {
            wireframe.visible = ImportedModelLoaderService.isWireframeVisible;
        });
        
        return ImportedModelLoaderService.isWireframeVisible;
    }

    /**
     * Update all wireframes to match their physics bodies
     * Call this in your main update loop
     */
    public static updateWireframes(): void {
        if (!ImportedModelLoaderService.isWireframeVisible) return;
        
        ImportedModelLoaderService.physicsSyncList.forEach(({mesh, body}) => {
            if (mesh && body) {
                // Update position
                mesh.position.set(
                    body.position.x,
                    body.position.y,
                    body.position.z
                );
                
                // Update rotation - need to normalize quaternion to avoid drift
                mesh.quaternion.set(
                    body.quaternion.x,
                    body.quaternion.y,
                    body.quaternion.z,
                    body.quaternion.w
                ).normalize();
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
