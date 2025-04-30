import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { SceneContext } from '../../global/scene/SceneContext';
import { WorldContext } from '../../global/world/WorldContext';
import { AmmoUtils } from '../../physics/AmmoUtils';

// Declare Ammo global
declare const Ammo: any;

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
    private physicsWorld: any; // Ammo.btDiscreteDynamicsWorld

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
        this.physicsWorld = WorldContext.getInstance();
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
        physicsBody: any | null = null // Ammo.btRigidBody
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
            
            // Create a trimesh for physics if enabled
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
        physicsBody: any | null // Ammo.btRigidBody
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

        // Create a trimesh for physics if enabled
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
     * @returns The created Ammo.js rigid body
     */
    private createTrimeshPhysics(
        object: THREE.Object3D, 
        position: THREE.Vector3, 
        scale: THREE.Vector3, 
        physicsBody: any | null // Ammo.btRigidBody
    ): any { // Ammo.btRigidBody
        // Get the Ammo world
        const world = this.physicsWorld;
        
        // Use existing body or create new one
        let body = physicsBody;
        if (!body) {
            // For Ammo.js, we need to create a new motion state first
            const transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
            
            const motionState = new Ammo.btDefaultMotionState(transform);
            
            // We'll build a compound shape for the entire model
            const compoundShape = new Ammo.btCompoundShape();
            
            // Rigid body construction info with zero mass for static objects
            const rbInfo = new Ammo.btRigidBodyConstructionInfo(
                0, // Zero mass makes it static
                motionState,
                compoundShape,
                new Ammo.btVector3(0, 0, 0) // Zero inertia for static objects
            );
            
            body = new Ammo.btRigidBody(rbInfo);
            
            // Set static collision flags
            body.setCollisionFlags(body.getCollisionFlags() | 1); // 1 = STATIC_OBJECT
            
            // Clean up construction objects
            Ammo.destroy(rbInfo);
            Ammo.destroy(transform);
        }
        
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
                    // Create a triangle mesh for the geometry
                    const mesh = this.createTriangleMesh(geometry);
                    
                    // Create a btBvhTriangleMeshShape from the triangle mesh
                    const shape = new Ammo.btBvhTriangleMeshShape(mesh, true, true);
                    
                    // Calculate the shape's transform relative to the body
                    const localTransform = new Ammo.btTransform();
                    localTransform.setIdentity();
                    
                    // Set relative position
                    const relativePosition = new Ammo.btVector3(
                        worldPosition.x - position.x,
                        worldPosition.y - position.y, 
                        worldPosition.z - position.z
                    );
                    localTransform.setOrigin(relativePosition);
                    
                    // Set relative rotation
                    const relativeRotation = new Ammo.btQuaternion(
                        worldQuaternion.x,
                        worldQuaternion.y,
                        worldQuaternion.z,
                        worldQuaternion.w
                    );
                    localTransform.setRotation(relativeRotation);
                    
                    // Add the shape to the compound shape if not using an existing body
                    if (!physicsBody) {
                        // Get compound shape from the body
                        const compoundShape = body.getCollisionShape();
                        
                        // Apply scale to the shape
                        // Ammo transforms don't directly support scale, so we need to scale
                        // the mesh itself or use a specific scaled shape
                        compoundShape.addChildShape(localTransform, shape);
                        
                        shapesAdded = true;
                    }
                    
                    // Create wireframe for visualization, regardless of current visibility
                    // Initial visibility will be set based on ImportedModelLoaderService.isWireframeVisible
                    this.createMeshWireframe(
                        child as THREE.Mesh,
                        worldPosition,
                        worldScale,
                        worldQuaternion,
                        body
                    );
                    
                    // Clean up Ammo objects
                    Ammo.destroy(relativePosition);
                    Ammo.destroy(relativeRotation);
                    Ammo.destroy(localTransform);
                    
                    // Note: We don't destroy the shape as it's now owned by the compound shape
                    // Same for the triangle mesh as it's referenced by the shape
                    
                    console.log(`Added shape to physics body at relative position (${worldPosition.x - position.x}, ${worldPosition.y - position.y}, ${worldPosition.z - position.z})`);
                }
            }
        });
        
        // If shapes were added, add the body to the Ammo world
        if (shapesAdded && !physicsBody) {
            world.addRigidBody(body);
            console.log("Added physics body to world", body);
        } else if (!shapesAdded) {
            console.warn("No valid meshes found for physics in the object:", object);
        }
        
        return body;
    }
    
    /**
     * Creates an Ammo.js triangle mesh from a Three.js buffer geometry
     * @param geometry Three.js buffer geometry to convert
     * @returns Ammo.btTriangleMesh
     */
    private createTriangleMesh(geometry: THREE.BufferGeometry): any {
        // Create triangle mesh
        const triangleMesh = new Ammo.btTriangleMesh(true, true);
        
        // Extract vertices from the geometry
        const positions = geometry.attributes.position.array;
        
        // Get indices if available, or create them
        let indices: number[];
        if (geometry.index) {
            indices = Array.from(geometry.index.array as Uint16Array | Uint32Array);
        } else {
            // If no index, create one that just counts up (0,1,2,3,...)
            indices = [];
            for (let i = 0; i < positions.length / 3; i++) {
                indices.push(i);
            }
        }
        
        // Temporary vectors for vertices
        const v0 = new Ammo.btVector3(0, 0, 0);
        const v1 = new Ammo.btVector3(0, 0, 0);
        const v2 = new Ammo.btVector3(0, 0, 0);
        
        // Add all triangles to the mesh
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i] * 3;
            const i1 = indices[i+1] * 3;
            const i2 = indices[i+2] * 3;
            
            v0.setValue(positions[i0], positions[i0+1], positions[i0+2]);
            v1.setValue(positions[i1], positions[i1+1], positions[i1+2]);
            v2.setValue(positions[i2], positions[i2+1], positions[i2+2]);
            
            triangleMesh.addTriangle(v0, v1, v2, true);
        }
        
        // Clean up temporary vectors
        Ammo.destroy(v0);
        Ammo.destroy(v1);
        Ammo.destroy(v2);
        
        return triangleMesh;
    }
    
    /**
     * Creates a wireframe representation of a box physics body for visualization
     * @param size Box dimensions
     * @param position Box position
     * @param physicsBody The physics body to visualize
     */
    private createBoxWireframe(size: THREE.Vector3, position: THREE.Vector3, physicsBody: any): void {
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
        physicsBody: any // Ammo.btRigidBody
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
        
        // Always start with wireframes invisible - they'll be toggled with the 'T' key
        wireframeMesh.visible = ImportedModelLoaderService.isWireframeVisible;
        wireframeMesh.renderOrder = 999; // Ensure wireframe renders on top
        this.scene.add(wireframeMesh);
        
        // Register wireframe for toggle with 'T' key
        this.registerWireframeForToggle(wireframeMesh, physicsBody);
    }
    
    /**
     * Registers a wireframe with the GameObject wireframe registry to toggle with 'T' key
     */
    private registerWireframeForToggle(wireframeMesh: THREE.LineSegments, physicsBody: any): void {
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
    private registerPhysicsSync(wireframeMesh: THREE.LineSegments, physicsBody: any): void {
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
    private static physicsSyncList: Array<{mesh: THREE.LineSegments, body: any}> = [];
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
     * Get the current wireframe visibility state
     */
    public static getWireframeVisibilityState(): boolean {
        return ImportedModelLoaderService.isWireframeVisible;
    }

    /**
     * Set the wireframe visibility state directly
     * This allows external systems to sync wireframe visibility
     */
    public static setWireframeVisibilityState(isVisible: boolean): void {
        if (ImportedModelLoaderService.isWireframeVisible !== isVisible) {
            ImportedModelLoaderService.isWireframeVisible = isVisible;
            
            ImportedModelLoaderService.wireframeMeshes.forEach(wireframe => {
                wireframe.visible = isVisible;
            });
        }
    }

    /**
     * Update all wireframes to match their physics bodies
     * Call this in your main update loop
     */
    public static updateWireframes(): void {
        if (!ImportedModelLoaderService.isWireframeVisible) return;
        
        ImportedModelLoaderService.physicsSyncList.forEach(({mesh, body}) => {
            if (mesh && body) {
                // Get the transform from the motion state
                const transform = new Ammo.btTransform();
                body.getMotionState().getWorldTransform(transform);
                
                // Update position
                const origin = transform.getOrigin();
                mesh.position.set(
                    origin.x(),
                    origin.y(),
                    origin.z()
                );
                
                // Update rotation
                const rotation = transform.getRotation();
                mesh.quaternion.set(
                    rotation.x(),
                    rotation.y(),
                    rotation.z(),
                    rotation.w()
                ).normalize();
                
                // Clean up Ammo.js object
                Ammo.destroy(transform);
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
