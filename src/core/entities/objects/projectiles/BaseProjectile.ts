import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject, { GameObjectOptions } from "../GameObject";
import { PlayerCamera } from "../../../camera/PlayerCamera";
import { WorldContext } from "../../../global/world/WorldContext";

export default abstract class BaseProjectile extends GameObject {
    protected origin: THREE.Vector3;
    protected direction: THREE.Vector3;
    protected playerCamera: PlayerCamera;
    protected worldContext: CANNON.World;
    protected hitPosition: THREE.Vector3 | null = null;
    protected hitObject: CANNON.Body | null = null;
    protected collisionFilterGroup: number = 2; // Default collision group for projectiles
    protected collisionFilterMask: number = -1; // Collide with everything by default

    /**
     * Creates a projectile originating from the player camera's position
     * @param options Additional GameObject options
     */
    constructor(options: GameObjectOptions = {}) {
        // Set addToCollection to false initially, we'll add it manually after full initialization
        // Also set skipMeshCreation to true so we can create meshes after origin and direction are set
        const projectileOptions = { 
            ...options, 
            addToCollection: false,
            skipMeshCreation: true 
        };
        super(projectileOptions);
        
        // Get camera reference
        this.playerCamera = PlayerCamera.getInstance();
        this.worldContext = WorldContext.getInstance();
        
        // Initialize vectors before they're used
        this.origin = new THREE.Vector3();
        this.direction = new THREE.Vector3(0, 0, -1);
        
        // Update the vectors from the camera
        this.updateFromCamera();
        
        // Now that our vectors are initialized, we can safely create the meshes
        this.createVisualMesh();
        this.createCollisionMesh();
        
        // Now add to the collection since we're fully initialized
        if (options.addToCollection !== false) {
            this.gameObjectManager.addGameObject(this);
        }
    }
    
    /**
     * Method to properly initialize the projectile
     * This can be overridden by subclasses to add custom initialization logic
     */
    public initialize(): void {
        // Default implementation - ensure vectors are up to date
        this.updateFromCamera();
        
        // Create meshes if needed
        this.createVisualMesh();
        this.createCollisionMesh();
    }
    
    /**
     * Check if this projectile is currently active
     * This should be overridden by subclasses with specific active-checking logic
     * @returns Whether the projectile is active and in use
     */
    public checkActive(): boolean {
        // Default implementation - projectile is active if visual mesh is visible
        return this.visualMesh.visible;
    }
    
    /**
     * Fire the projectile - must be implemented by subclasses
     */
    public abstract fire(): void;
    
    /**
     * Updates the projectile origin and direction from the current camera position
     */
    public updateFromCamera(): void {
        // Get camera
        const camera = this.playerCamera.getCamera();
        
        // Update origin - set to camera position
        this.origin.copy(camera.position);
        
        // Get world direction vector from camera
        // This gets the direction the camera is facing in world space
        this.direction.set(0, 0, -1);  // Start with forward vector in camera space
        this.direction.applyQuaternion(camera.quaternion);  // Transform to world space
        this.direction.normalize();  // Ensure we have a unit vector
        
        // Reset hit detection
        this.hitPosition = null;
        this.hitObject = null;
        
        // Debug log
        console.log(`Camera position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
        console.log(`Camera quaternion: (${camera.quaternion.x.toFixed(2)}, ${camera.quaternion.y.toFixed(2)}, ${camera.quaternion.z.toFixed(2)}, ${camera.quaternion.w.toFixed(2)})`);
    }
    
    /**
     * Performs a physics raycast to detect collisions
     * @returns The distance to the hit point, or null if no hit
     */
    protected performCollisionDetection(): number | null {
        // Create a ray starting at origin and going in our direction
        const raycastResult = new CANNON.RaycastResult();
        
        // Slightly offset the origin in the direction we're looking to avoid self-collision
        const adjustedOrigin = new CANNON.Vec3(
            this.origin.x + this.direction.x * 0.2,
            this.origin.y + this.direction.y * 0.2,
            this.origin.z + this.direction.z * 0.2
        );
        
        const ray = new CANNON.Ray(
            adjustedOrigin,
            new CANNON.Vec3(this.direction.x, this.direction.y, this.direction.z)
        );
        
        // Configure raycast options
        ray.checkCollisionResponse = true; // Only detect bodies that can collide
        ray.skipBackfaces = true; // Don't detect back faces
        
        // Set collision filtering
        ray.collisionFilterGroup = this.collisionFilterGroup;
        ray.collisionFilterMask = this.collisionFilterMask;
        
        console.log(`Ray from: (${adjustedOrigin.x.toFixed(2)}, ${adjustedOrigin.y.toFixed(2)}, ${adjustedOrigin.z.toFixed(2)})`);
        
        // Perform the raycast without any distance constraints
        ray.intersectWorld(this.worldContext, {
            mode: CANNON.Ray.CLOSEST,
            result: raycastResult,
            collisionFilterMask: ray.collisionFilterMask,
            collisionFilterGroup: ray.collisionFilterGroup,
        });
        
        // Check if we hit something
        if (raycastResult.hasHit) {
            // Store hit information
            this.hitPosition = new THREE.Vector3(
                raycastResult.hitPointWorld.x,
                raycastResult.hitPointWorld.y,
                raycastResult.hitPointWorld.z
            );
            this.hitObject = raycastResult.body;
            
            // Calculate the distance from origin to hit point
            const hitDistance = this.origin.distanceTo(this.hitPosition);
            console.log(`Projectile hit object at distance ${hitDistance.toFixed(2)}`);
            
            return hitDistance;
        }
        
        // No hit detected
        console.log(`No hit detected from raycast`);
        return null;
    }
    
    /**
     * Set collision filtering for the projectile
     * @param group The collision group this projectile belongs to
     * @param mask The collision mask determining what groups this projectile collides with
     */
    public setCollisionFiltering(group: number, mask: number): void {
        this.collisionFilterGroup = group;
        this.collisionFilterMask = mask;
    }

    /**
     * Configure the projectile to ignore specific collision groups
     * @param groupToIgnore The collision group to ignore
     */
    public ignoreCollisionGroup(groupToIgnore: number): void {
        // Use bitwise operations to remove the group from the mask
        this.collisionFilterMask = this.collisionFilterMask & ~groupToIgnore;
    }
    
    /**
     * Deactivate the projectile
     * Default implementation - hide the visual mesh
     */
    public deactivate(): void {
        if (this.visualMesh) {
            this.visualMesh.visible = false;
        }
    }
    
    /**
     * Get the point where the projectile hit, if any
     * @returns The hit position or null if no hit detected
     */
    public getHitPosition(): THREE.Vector3 | null {
        return this.hitPosition ? this.hitPosition.clone() : null;
    }
    
    /**
     * Get the body that was hit, if any
     * @returns The hit body or null if no hit detected
     */
    public getHitObject(): CANNON.Body | null {
        return this.hitObject;
    }
    
    /**
     * Get the projectile's origin point
     */
    public getOrigin(): THREE.Vector3 {
        return this.origin.clone();
    }
    
    /**
     * Get the projectile's direction vector
     */
    public getDirection(): THREE.Vector3 {
        return this.direction.clone();
    }
    
    /**
     * Abstract methods to be implemented by child classes
     */
    protected abstract createVisualMesh(): void;
    protected abstract createCollisionMesh(): void;

    /**
     * Reset the projectile to its initial state for recycling
     * This helps with object pooling by allowing projectiles to be reused
     */
    public reset(): void {
        // Reset hit detection
        this.hitPosition = null;
        this.hitObject = null;
        
        // Reset to initial position/direction
        this.updateFromCamera();
        
        // Hide the visual mesh
        if (this.visualMesh) {
            this.visualMesh.visible = false;
        }
        
        console.log(`Projectile reset for recycling`);
    }
}