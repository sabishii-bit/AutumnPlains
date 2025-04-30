import * as THREE from 'three';
// Replace CANNON import with Ammo declaration
import { Scene, Vector3 } from 'three';
import { WorldContext } from '../../global/world/WorldContext';
import { SceneContext } from '../../global/scene/SceneContext';
import { generateUUID } from 'three/src/math/MathUtils';
import { GameObjectManager } from '../GameObjectManager';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { MaterialType, PhysicsMaterialsManager } from '../../physics/PhysicsMaterialsManager';
import { PlayerCharacter } from './characters/PlayerCharacter';
import { AmmoUtils } from '../../physics/AmmoUtils';

/**
 * Options interface for GameObject initialization
 */
export interface GameObjectOptions {
    position?: THREE.Vector3;
    objectId?: string;
    visualMeshOptions?: THREE.Mesh;
    // Update collision mesh options to use Ammo
    collisionMeshOptions?: any; // Ammo.btRigidBody
    /**
     * Whether to automatically add the object to the scene. Default: true
     * @deprecated Use addToCollection instead which handles both scene and physics world
     */
    addToScene?: boolean;
    /**
     * Whether to automatically add the object to the GameObjectManager collection.
     * When true (default), the object will be automatically added to the scene and physics world.
     * When false, you must manually add the object using GameObjectManager.
     */
    addToCollection?: boolean;
    materialType?: MaterialType;
    skipMeshCreation?: boolean;
}

// Simple interface for Ammo.js body options
export interface AmmoBodyOptions {
    mass: number;
    shape?: any; // Ammo.btCollisionShape
    position?: THREE.Vector3;
    quaternion?: THREE.Quaternion;
    linearDamping?: number;
    angularDamping?: number;
    friction?: number;
    restitution?: number;
}

export default abstract class GameObject {
    protected visualMesh: THREE.Mesh | THREE.Group;
    protected collisionMesh!: any; // Ammo.btRigidBody
    protected position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    protected rotation: THREE.Vector3 | null = null;
    protected worldContext: any = WorldContext.getInstance(); // Ammo.btDiscreteDynamicsWorld
    protected sceneContext: Scene = SceneContext.getInstance();
    protected gameObjectManager: GameObjectManager = GameObjectManager.getInstance();
    protected objectId: string = "";
    protected materialType: MaterialType = MaterialType.DEFAULT;
    protected physicsManager: PhysicsMaterialsManager = PhysicsMaterialsManager.getInstance();
    private wireframeMesh: THREE.LineSegments | null = null;
    private isWireframeVisible: boolean = false;
    private hasCreatedWireframe: boolean = false;
    // Transformation for Ammo
    private motionState: any = null; // Ammo.btDefaultMotionState

    /**
     * Creates a new GameObject with the specified options
     * @param options Configuration options for the GameObject
     */
    constructor(options: GameObjectOptions = {}) {
        // Initialize mesh with a simple placeholder if no visualMeshOptions provided
        this.visualMesh = options.visualMeshOptions || new THREE.Mesh(
            new THREE.BoxGeometry(0, 0, 0), // Placeholder geometry
            new THREE.MeshBasicMaterial() // Placeholder material
        );
        
        // Set position
        this.setPosition(options.position || new THREE.Vector3(0, 0, 0));
        
        // Apply translation to the object's visual mesh
        this.visualMesh.position.copy(this.position);

        // Set object ID
        this.objectId = options.objectId || generateUUID();
        
        // Set material type
        if (options.materialType) {
            this.materialType = options.materialType;
        }

        // Initialize the GameObject by setting up meshes
        // NOTE: Some specialized child classes (like BaseProjectile) may handle
        // their own initialization timing, so they can set options.skipMeshCreation = true
        if (!options.skipMeshCreation) {
            this.createVisualMesh();
            this.createCollisionMesh();
        }
        
        // Auto-add to collection unless specified not to
        // Note: Some child classes (like BaseCharacter) may have special physics components
        // (such as constraints or additional bodies) that require direct world context access.
        // These special cases should be documented in the child classes.
        if (options.addToCollection !== false) {
            this.gameObjectManager.addGameObject(this);
        }
    }

    /**
     * Creates a physics body with the appropriate material
     * @param options Body options
     * @param materialType Optional override material type
     * @returns Ammo.btRigidBody with material applied
     */
    protected createPhysicsBody(options: AmmoBodyOptions, materialType?: MaterialType): any {
        const type = materialType || this.materialType;
        const Ammo = WorldContext.getAmmo();
        
        // Get position and quaternion from options or defaults
        const pos = options.position || this.position;
        const quat = options.quaternion || new THREE.Quaternion();
        
        // Create motion state using AmmoUtils
        this.motionState = AmmoUtils.createMotionState(pos, quat);
        
        // Create collision shape if not provided
        const shape = options.shape || new Ammo.btBoxShape(new Ammo.btVector3(0.5, 0.5, 0.5));
        
        // Calculate local inertia if mass > 0
        const localInertia = AmmoUtils.createZeroVector();
        if (options.mass > 0) {
            shape.calculateLocalInertia(options.mass, localInertia);
        }
        
        // Create the rigid body
        const body = AmmoUtils.createRigidBody(options.mass, this.motionState, shape, localInertia);
        
        // Apply material properties from PhysicsMaterialsManager
        this.physicsManager.applyMaterialToBody(body, type);
        
        // Apply additional options if provided
        if (options.linearDamping !== undefined || options.angularDamping !== undefined) {
            body.setDamping(
                options.linearDamping || 0, 
                options.angularDamping || 0
            );
        }
        
        if (options.friction !== undefined) {
            body.setFriction(options.friction);
        }
        
        if (options.restitution !== undefined) {
            body.setRestitution(options.restitution);
        }
        
        // Clean up local inertia
        Ammo.destroy(localInertia);
        
        return body;
    }

    // Abstract method to create the visual part of the object
    protected abstract createVisualMesh(): void;

    // Abstract method to create the physics part of the object
    protected abstract createCollisionMesh(): void;

    public setPosition(position: Vector3): void {
        this.position = position;
    }

    public getMesh() {
        return this.visualMesh;
    }

    public getId(): string {
        return this.objectId;
    }

    public setId(objectId: string) {
        this.objectId = objectId;
    }

    public getPosition(): THREE.Vector3 {
        return this.position;
    }

    public getCollisionBody(): any { // Ammo.btRigidBody
        return this.collisionMesh;
    }
    
    public update(deltaTime: number): void {
        // Sync mesh with the physics body
        if (this.collisionMesh) {
            this.syncMeshWithBody();
        }

        // Call abstract animate method which can be overridden by subclasses
        this.animate(deltaTime);
    }

    protected syncMeshWithBody() {
        if (!this.collisionMesh) return;
        
        try {
            const Ammo = WorldContext.getAmmo();
            // Create a transform to hold the rigid body's position and rotation
            const transform = new Ammo.btTransform();
            
            // Get the transform from the motion state
            if (this.motionState) {
                this.motionState.getWorldTransform(transform);
            } else {
                // Alternatively get directly from the body
                this.collisionMesh.getMotionState().getWorldTransform(transform);
            }
            
            // Use AmmoUtils to read the transform into Three.js objects
            const position = this.visualMesh.position;
            const quaternion = this.visualMesh.quaternion;
            
            AmmoUtils.readTransform(transform, position, quaternion);
    
            // Check for invalid values (NaN, Infinity)
            if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z) ||
                !isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) {
                console.error(`Invalid physics position detected for ${this.objectId}:`, position);
                // Prevent applying invalid positions to the visual mesh
                return;
            }
            
            // Check for invalid quaternion values
            if (isNaN(quaternion.x) || isNaN(quaternion.y) || isNaN(quaternion.z) || isNaN(quaternion.w) ||
                !isFinite(quaternion.x) || !isFinite(quaternion.y) || !isFinite(quaternion.z) || !isFinite(quaternion.w)) {
                console.error(`Invalid physics quaternion detected for ${this.objectId}:`, quaternion);
                // Prevent applying invalid rotation to the visual mesh
                return;
            }
            
            // Normalize the quaternion to avoid rendering issues
            quaternion.normalize();
            
            // Sync wireframe position and rotation with the main mesh if wireframe is enabled
            if (this.wireframeMesh) {
                this.wireframeMesh.position.copy(this.visualMesh.position);
                this.wireframeMesh.quaternion.copy(this.visualMesh.quaternion);
            }
            
            // Clean up transform (memory management for Ammo.js)
            Ammo.destroy(transform);
        } catch (error) {
            console.error(`Error in syncMeshWithBody for object ${this.objectId}:`, error);
        }
    }

    public getID(): string {
        return this.objectId;
    }

    protected animate(deltaTime: number): void {
        // Default animate logic (if any), can be overridden in subclasses
    }

    /**
     * Apply a force to the center of mass of this object
     * @param force Force vector to apply
     */
    public applyCentralForce(force: THREE.Vector3): void {
        if (this.collisionMesh) {
            AmmoUtils.applyCentralForce(this.collisionMesh, force);
        }
    }

    /**
     * Apply an impulse to the center of mass of this object
     * @param impulse Impulse vector to apply
     */
    public applyCentralImpulse(impulse: THREE.Vector3): void {
        if (this.collisionMesh) {
            AmmoUtils.applyCentralImpulse(this.collisionMesh, impulse);
        }
    }

    /**
     * Get the current linear velocity of this object
     * @returns THREE.Vector3 representing the velocity
     */
    public getLinearVelocity(): THREE.Vector3 {
        if (this.collisionMesh) {
            return AmmoUtils.getLinearVelocity(this.collisionMesh);
        }
        return new THREE.Vector3();
    }

    /**
     * Set the linear velocity of this object
     * @param velocity THREE.Vector3 representing the new velocity
     */
    public setLinearVelocity(velocity: THREE.Vector3): void {
        if (this.collisionMesh) {
            AmmoUtils.setLinearVelocity(this.collisionMesh, velocity);
        }
    }

    /**
     * Activate the physics body (wake it up)
     * @param forceActivation Whether to force activation
     */
    public activate(forceActivation: boolean = false): void {
        if (this.collisionMesh) {
            AmmoUtils.activateRigidBody(this.collisionMesh, forceActivation);
        }
    }

    // Create wireframe based on the existing collision mesh
    public createCollisionMeshWireframe(): void {
        // Only create the wireframe if it doesn't exist yet
        // AND if this object has a collision mesh
        if (!this.wireframeMesh && !this.hasCreatedWireframe && this.collisionMesh) {
            try {
                // Handle visualMesh being a Group or a Mesh
                let wireframeGeometry;
                if (this.visualMesh instanceof THREE.Group) {
                    // If visualMesh is a group, merge its geometries for the wireframe
                    const geometries: THREE.BufferGeometry[] = [];
                    this.visualMesh.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            geometries.push((child as THREE.Mesh).geometry);
                        }
                    });
                    
                    if (geometries.length > 0) {
                        wireframeGeometry = mergeGeometries(geometries);
                    } else {
                        console.warn(`No valid geometries found in group for wireframe on ${this.objectId}`);
                        return;
                    }
                } else if (this.visualMesh instanceof THREE.Mesh) {
                    // Otherwise, use the geometry directly
                    wireframeGeometry = new THREE.WireframeGeometry((this.visualMesh as THREE.Mesh).geometry);
                } else {
                    console.warn(`Cannot create wireframe for ${this.objectId} - unsupported mesh type`);
                    return;
                }
                
                const wireframeMaterial = new THREE.LineBasicMaterial({ 
                    color: 0x00ff00,
                    depthTest: false,
                    opacity: 0.5,
                    transparent: true
                });
                this.wireframeMesh = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                this.wireframeMesh.position.copy(this.visualMesh.position);
                this.wireframeMesh.quaternion.copy(this.visualMesh.quaternion);
                this.wireframeMesh.scale.copy(this.visualMesh.scale);
                
                // Set initial visibility to match current global state
                this.wireframeMesh.visible = this.isWireframeVisible;
                this.wireframeMesh.renderOrder = 999; // Ensure wireframe renders on top
                
                this.sceneContext.add(this.wireframeMesh);
                this.hasCreatedWireframe = true;
                
                console.log(`Created wireframe for GameObject ${this.objectId}`);
            } catch (error) {
                console.error(`Failed to create wireframe for ${this.objectId}:`, error);
            }
        }
    }

    // Toggle the visibility of the wireframe
    public toggleWireframeVisibility(): void {
        if (this.wireframeMesh) {
            this.isWireframeVisible = !this.isWireframeVisible;
            // Use type assertion to avoid type issues
            (this.wireframeMesh as THREE.Object3D).visible = this.isWireframeVisible;
        } else if (!this.hasCreatedWireframe) {
            // Create wireframe if we haven't tried yet
            this.createCollisionMeshWireframe();
            if (this.wireframeMesh) {
                this.isWireframeVisible = true;
                // Use type assertion to avoid type issues
                (this.wireframeMesh as THREE.Object3D).visible = this.isWireframeVisible;
            }
        }
    }
    
    // Directly set wireframe visibility
    public setWireframeVisibility(isVisible: boolean): void {
        if (this.wireframeMesh) {
            this.isWireframeVisible = isVisible;
            // Use type assertion to avoid type issues
            (this.wireframeMesh as THREE.Object3D).visible = this.isWireframeVisible;
        } else if (isVisible && !this.hasCreatedWireframe) {
            // Create wireframe if needed and we're turning visibility on
            this.createCollisionMeshWireframe();
            if (this.wireframeMesh) {
                this.isWireframeVisible = isVisible;
                // Use type assertion to avoid type issues
                (this.wireframeMesh as THREE.Object3D).visible = this.isWireframeVisible;
            }
        }
    }
    
    // Get current wireframe visibility
    public getWireframeVisibility(): boolean {
        return this.isWireframeVisible;
    }
}
