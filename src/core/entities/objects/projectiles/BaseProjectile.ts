import * as THREE from 'three';
import GameObject, { GameObjectOptions } from "../GameObject";
import { PlayerCamera } from "../../../camera/PlayerCamera";

export default abstract class BaseProjectile extends GameObject {
    protected origin: THREE.Vector3;
    protected direction: THREE.Vector3;
    protected playerCamera: PlayerCamera;

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
}