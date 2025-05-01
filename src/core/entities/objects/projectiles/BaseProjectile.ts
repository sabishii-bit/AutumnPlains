import * as THREE from 'three';
import GameObject, { GameObjectOptions } from "../GameObject";
import { PlayerCamera } from "../../../camera/PlayerCamera";
import { GameObjectManager } from "../../../entities/GameObjectManager";
import { PlayerCharacter } from "../characters/PlayerCharacter";
import { AmmoUtils } from "../../../physics/AmmoUtils";
import { WorldContext } from "../../../global/world/WorldContext";

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
     * Check for collisions with other game objects using Ammo.js
     * @returns True if the ray intersects with a valid object
     */
    protected checkCollisions(): boolean {
        try {
            const Ammo = WorldContext.getAmmo();
            
            // Get player character to exclude from collisions
            const playerCharacter = PlayerCharacter.getInstance();
            
            // Create ray for Ammo.js
            const rayFrom = new Ammo.btVector3(this.origin.x, this.origin.y, this.origin.z);
            const rayTo = new Ammo.btVector3(
                this.origin.x + this.direction.x * this.maxRaycastDistance,
                this.origin.y + this.direction.y * this.maxRaycastDistance,
                this.origin.z + this.direction.z * this.maxRaycastDistance
            );
            
            // Create the raycast callback
            const rayCallback = new Ammo.ClosestRayResultCallback(rayFrom, rayTo);
            
            // Set collision filter to exclude character group (assuming group 4 is character group)
            // Note: Ammo.js filtering works differently than CANNON.js
            // We might need to adjust these values based on your collision group setup
            rayCallback.set_m_collisionFilterGroup(0xFFFF); // All groups
            rayCallback.set_m_collisionFilterMask(0xFFFF & ~(4)); // All groups except 4 (character)
            
            // Perform the raycast
            this.worldContext.rayTest(rayFrom, rayTo, rayCallback);
            
            // Check if we hit anything
            const hasHit = rayCallback.hasHit();
            
            if (hasHit) {
                // Get hit information
                const hitPointWorld = rayCallback.get_m_hitPointWorld();
                const hitNormalWorld = rayCallback.get_m_hitNormalWorld();
                const hitObject = rayCallback.get_m_collisionObject();
                
                // Store hit position
                this.hitPosition = new THREE.Vector3(
                    hitPointWorld.x(),
                    hitPointWorld.y(),
                    hitPointWorld.z()
                );
                
                // Store hit normal
                this.hitNormal = new THREE.Vector3(
                    hitNormalWorld.x(),
                    hitNormalWorld.y(),
                    hitNormalWorld.z()
                );
                
                // Find the GameObject this collision body belongs to
                const allObjects = GameObjectManager.getAllGameObjects();
                this.hitObject = allObjects.find((obj: GameObject) => {
                    // Check if the collision body belongs to this GameObject
                    // We need to handle this differently in Ammo.js
                    if (!obj.getCollisionBody()) return false;
                    
                    // In Ammo.js, we can't directly compare objects
                    // We can try to match by checking pointer equality or using userData
                    try {
                        // If userData is available with an ID, we can use that
                        const objBody = obj.getCollisionBody();
                        
                        // Skip if this is another projectile
                        if (obj instanceof BaseProjectile) return false;
                        
                        // Direct comparison - might work in some cases
                        if (objBody === hitObject) return true;
                        
                        // Try to compare using btBroadphaseProxy pointer
                        const objProxy = objBody.getBroadphaseHandle();
                        const hitProxy = hitObject.getBroadphaseHandle();
                        if (objProxy && hitProxy && objProxy.equals(hitProxy)) return true;
                        
                        // Try using userIndex if available
                        if (typeof objBody.getUserIndex === 'function' && 
                            typeof hitObject.getUserIndex === 'function') {
                            return objBody.getUserIndex() === hitObject.getUserIndex();
                        }
                        
                        return false;
                    } catch (error) {
                        return false;
                    }
                }) || null;
                
                // Log hit details for debugging
                console.log(`[BaseProjectile] Ray hit details:`, {
                    hitPosition: this.hitPosition,
                    hitNormal: this.hitNormal,
                    hitObject: this.hitObject ? `${this.hitObject.constructor.name} (ID: ${this.hitObject.getId()})` : 'unknown'
                });
                
                // Handle special case for ground/plane objects
                if (!this.hitObject) {
                    // Try to identify based on hit normal and position
                    if (Math.abs(this.hitNormal.y) > 0.9 && Math.abs(this.hitPosition.y) < 0.2) {
                        // Likely a ground plane - try to find it
                        const groundObjects = allObjects.filter(obj => 
                            obj.constructor.name.includes('Ground') || 
                            obj.constructor.name.includes('Environment'));
                            
                        if (groundObjects.length > 0) {
                            this.hitObject = groundObjects[0];
                            console.log(`[BaseProjectile] Identified hit as ground: ${this.hitObject.constructor.name}`);
                        }
                    }
                }
                
                // Clean up Ammo.js objects
                Ammo.destroy(rayCallback);
                Ammo.destroy(rayFrom);
                Ammo.destroy(rayTo);
                
                return true;
            } else {
                // No hit - reset hit information
                this.hitObject = null;
                this.hitPosition = null;
                this.hitNormal = null;
                
                // Clean up Ammo.js objects
                Ammo.destroy(rayCallback);
                Ammo.destroy(rayFrom);
                Ammo.destroy(rayTo);
                
                return false;
            }
        } catch (error) {
            console.error("[BaseProjectile] Error during collision check:", error);
            this.hitObject = null;
            this.hitPosition = null;
            this.hitNormal = null;
            return false;
        }
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