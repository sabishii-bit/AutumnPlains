import * as THREE from 'three';
// Replace CANNON import with Ammo declaration
import { Scene, Vector3 } from 'three';
import { WorldContext } from '../../global/world/WorldContext';
import { SceneContext } from '../../global/scene/SceneContext';
import { generateUUID } from 'three/src/math/MathUtils';
import { GameObjectManager } from '../GameObjectManager';
import { MaterialType, PhysicsMaterialsManager } from '../../physics/PhysicsMaterialsManager';
import { PlayerCharacter } from './characters/PlayerCharacter';
import { AmmoUtils } from '../../physics/AmmoUtils';
import { ComponentManager } from '../components/Component';
import { PhysicsSyncComponent } from '../components/PhysicsSyncComponent';
import { WireframeComponent } from '../components/WireframeComponent';
import { PhysicsForceComponent } from '../components/PhysicsForceComponent';

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
    // Transformation for Ammo
    private motionState: any = null; // Ammo.btDefaultMotionState
    // Component system
    protected componentManager: ComponentManager;

    /**
     * Creates a new GameObject with the specified options
     * @param options Configuration options for the GameObject
     */
    constructor(options: GameObjectOptions = {}) {
        // Initialize component manager
        this.componentManager = new ComponentManager(this);

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
        // Update all components
        this.componentManager.updateAll(deltaTime);

        // Call abstract animate method which can be overridden by subclasses
        this.animate(deltaTime);
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
        const forceComponent = this.componentManager.getComponent<PhysicsForceComponent>('physicsForce');
        if (forceComponent) {
            forceComponent.applyCentralForce(force);
        } else if (this.collisionMesh) {
            // Fallback for objects without the component
            AmmoUtils.applyCentralForce(this.collisionMesh, force);
        }
    }

    /**
     * Apply an impulse to the center of mass of this object
     * @param impulse Impulse vector to apply
     */
    public applyCentralImpulse(impulse: THREE.Vector3): void {
        const forceComponent = this.componentManager.getComponent<PhysicsForceComponent>('physicsForce');
        if (forceComponent) {
            forceComponent.applyCentralImpulse(impulse);
        } else if (this.collisionMesh) {
            // Fallback for objects without the component
            AmmoUtils.applyCentralImpulse(this.collisionMesh, impulse);
        }
    }

    /**
     * Get the current linear velocity of this object
     * @returns THREE.Vector3 representing the velocity
     */
    public getLinearVelocity(): THREE.Vector3 {
        const forceComponent = this.componentManager.getComponent<PhysicsForceComponent>('physicsForce');
        if (forceComponent) {
            return forceComponent.getLinearVelocity();
        } else if (this.collisionMesh) {
            // Fallback for objects without the component
            return AmmoUtils.getLinearVelocity(this.collisionMesh);
        }
        return new THREE.Vector3();
    }

    /**
     * Set the linear velocity of this object
     * @param velocity THREE.Vector3 representing the new velocity
     */
    public setLinearVelocity(velocity: THREE.Vector3): void {
        const forceComponent = this.componentManager.getComponent<PhysicsForceComponent>('physicsForce');
        if (forceComponent) {
            forceComponent.setLinearVelocity(velocity);
        } else if (this.collisionMesh) {
            // Fallback for objects without the component
            AmmoUtils.setLinearVelocity(this.collisionMesh, velocity);
        }
    }

    /**
     * Activate the physics body (wake it up)
     * @param forceActivation Whether to force activation
     */
    public activate(forceActivation: boolean = false): void {
        const forceComponent = this.componentManager.getComponent<PhysicsForceComponent>('physicsForce');
        if (forceComponent) {
            forceComponent.activate(forceActivation);
        } else if (this.collisionMesh) {
            // Fallback for objects without the component
            AmmoUtils.activateRigidBody(this.collisionMesh, forceActivation);
        }
    }

    // Create wireframe based on the existing collision mesh
    public createCollisionMeshWireframe(): void {
        const wireframeComponent = this.componentManager.getComponent<WireframeComponent>('wireframe');
        if (wireframeComponent) {
            wireframeComponent.createWireframe();
        }
    }

    // Toggle the visibility of the wireframe
    public toggleWireframeVisibility(): void {
        const wireframeComponent = this.componentManager.getComponent<WireframeComponent>('wireframe');
        if (wireframeComponent) {
            wireframeComponent.toggleVisibility();
        }
    }

    // Directly set wireframe visibility
    public setWireframeVisibility(isVisible: boolean): void {
        const wireframeComponent = this.componentManager.getComponent<WireframeComponent>('wireframe');
        if (wireframeComponent) {
            wireframeComponent.setVisibility(isVisible);
        }
    }

    // Get current wireframe visibility
    public getWireframeVisibility(): boolean {
        const wireframeComponent = this.componentManager.getComponent<WireframeComponent>('wireframe');
        if (wireframeComponent) {
            return wireframeComponent.getVisibility();
        }
        return false;
    }

    /**
     * Add a component to this GameObject
     * @param name Component identifier
     * @param component Component instance
     */
    public addComponent(name: string, component: any): void {
        this.componentManager.addComponent(name, component);
    }

    /**
     * Get a component from this GameObject
     * @param name Component identifier
     */
    public getComponent<T>(name: string): T | undefined {
        return this.componentManager.getComponent<T>(name);
    }

    /**
     * Check if this GameObject has a component
     * @param name Component identifier
     */
    public hasComponent(name: string): boolean {
        return this.componentManager.hasComponent(name);
    }
}
