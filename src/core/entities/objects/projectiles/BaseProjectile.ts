import * as THREE from 'three';
import GameObject, { GameObjectOptions } from "../GameObject";
import { PlayerCamera } from "../../../camera/PlayerCamera";
import * as CANNON from 'cannon-es';
import { GameObjectManager } from "../../../entities/GameObjectManager";
import { PlayerCharacter } from "../characters/PlayerCharacter";

export default abstract class BaseProjectile extends GameObject {
    protected origin: THREE.Vector3;
    protected direction: THREE.Vector3;
    protected playerCamera: PlayerCamera;
    protected hitObject: GameObject | null = null;
    protected hitPosition: THREE.Vector3 | null = null;
    protected maxRaycastDistance: number = 1000;
    protected hitNormal: THREE.Vector3 | null = null;

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
        
        // Initialize vectors before they're used
        this.origin = new THREE.Vector3();
        this.direction = new THREE.Vector3(0, 0, -1);
        
        // Update the vectors from the camera
        this.updateFromCamera();
        
        // Now that our vectors are initialized, we can safely create the meshes
        this.createVisualMesh();
        
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
        
        // Debug log
        console.log(`Camera position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
        console.log(`Camera quaternion: (${camera.quaternion.x.toFixed(2)}, ${camera.quaternion.y.toFixed(2)}, ${camera.quaternion.z.toFixed(2)}, ${camera.quaternion.w.toFixed(2)})`);
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
     * Abstract method to be implemented by child classes
     */
    protected abstract createVisualMesh(): void;

    /**
     * Reset the projectile to its initial state for recycling
     * This helps with object pooling by allowing projectiles to be reused
     */
    public reset(): void {
        // Reset to initial position/direction
        this.updateFromCamera();
        
        // Hide the visual mesh
        if (this.visualMesh) {
            this.visualMesh.visible = false;
        }
        
        console.log(`Projectile reset for recycling`);
    }

    /**
     * Check for collisions with other game objects
     * @returns True if the ray intersects with a valid object
     */
    protected checkCollisions(): boolean {
        // Get player character to exclude from collisions
        const playerCharacter = PlayerCharacter.getInstance();
        const playerBody = playerCharacter.getCollisionBody();
        
        // Create ray for CANNON
        const rayFrom = new CANNON.Vec3(this.origin.x, this.origin.y, this.origin.z);
        const rayTo = new CANNON.Vec3(
            this.origin.x + this.direction.x * this.maxRaycastDistance,
            this.origin.y + this.direction.y * this.maxRaycastDistance,
            this.origin.z + this.direction.z * this.maxRaycastDistance
        );
        
        // Create raycast options - only collide with bodies that aren't projectiles or player
        const raycastOptions = {
            skipBackfaces: false, // Changed from true to false to allow hitting both sides of planes
            collisionFilterMask: ~(4), // Collide with everything EXCEPT group 4 (character group)
            from: rayFrom,
            to: rayTo,
        };
        
        // Perform the raycast
        const result = new CANNON.RaycastResult();
        this.worldContext.raycastClosest(rayFrom, rayTo, raycastOptions, result);
        
        // Check if we hit anything
        if (result.hasHit) {
            // Store hit normal if available
            if (result.hitNormalWorld) {
                this.hitNormal = new THREE.Vector3(
                    result.hitNormalWorld.x,
                    result.hitNormalWorld.y,
                    result.hitNormalWorld.z
                );
            } else {
                this.hitNormal = null;
            }
            
            // Find which GameObject this body belongs to
            const hitBody = result.body;
            const allObjects = GameObjectManager.getAllGameObjects();
            
            // Find the object that owns this body
            this.hitObject = allObjects.find((obj: GameObject) => {
                return obj.getCollisionBody() === hitBody && !(obj instanceof BaseProjectile);
            }) || null;
            
            // Calculate hit position in THREE.js coordinates
            this.hitPosition = new THREE.Vector3(
                result.hitPointWorld.x,
                result.hitPointWorld.y,
                result.hitPointWorld.z
            );
            
            // Log more details about the hit for debugging
            console.log(`[BaseProjectile] Ray hit details:`, {
                hitBody: hitBody ? `ID: ${hitBody.id}, Mass: ${hitBody.mass}, Type: ${hitBody.shapes[0] ? hitBody.shapes[0].type : 'unknown'}` : 'unknown',
                hitPosition: this.hitPosition,
                hitNormal: this.hitNormal,
                hitDistance: result.distance,
                rayFrom: new THREE.Vector3(rayFrom.x, rayFrom.y, rayFrom.z),
                rayTo: new THREE.Vector3(rayTo.x, rayTo.y, rayTo.z),
                collisionGroup: hitBody ? hitBody.collisionFilterGroup : 'unknown',
                collisionMask: hitBody ? hitBody.collisionFilterMask : 'unknown'
            });
            
            // Attempt to identify special objects like ground plane
            if (hitBody && hitBody.shapes[0] && hitBody.shapes[0].type === CANNON.Shape.types.PLANE) {
                console.log(`[BaseProjectile] Hit appears to be a ground plane`);
                
                // If we hit a plane with id 1, it's likely the ground
                if (hitBody.id === 1) {
                    // Try to find the ground object manually
                    const allObjects = GameObjectManager.getAllGameObjects();
                    const groundObjects = allObjects.filter(obj => 
                        obj.constructor.name.includes('Ground') || 
                        obj.constructor.name.includes('Environment'));
                        
                    if (groundObjects.length > 0) {
                        this.hitObject = groundObjects[0];
                        console.log(`[BaseProjectile] Identified hit as ground: ${this.hitObject.constructor.name}`);
                    }
                }
            }
            
            return true;
        }
        
        // No hit
        this.hitObject = null;
        this.hitPosition = null;
        this.hitNormal = null;
        return false;
    }
    
    /**
     * Get the object hit by this projectile, if any
     */
    public getHitObject(): GameObject | null {
        return this.hitObject;
    }
    
    /**
     * Get the hit position, if any
     */
    public getHitPosition(): THREE.Vector3 | null {
        return this.hitPosition ? this.hitPosition.clone() : null;
    }
    
    /**
     * Set maximum raycast distance
     */
    public setMaxRaycastDistance(distance: number): void {
        this.maxRaycastDistance = distance;
    }

    /**
     * Get the normal vector at the hit point, if any
     */
    public getHitNormal(): THREE.Vector3 | null {
        return this.hitNormal ? this.hitNormal.clone() : null;
    }
}