import * as THREE from 'three';
import GameObject, { GameObjectOptions } from '../GameObject';
import { MaterialType } from '../../../physics/PhysicsMaterialsManager';
import { WorldContext } from '../../../global/world/WorldContext';

/**
 * NetworkPlayerCharacter - Ultra-simplified representation of a remote player
 * This class intentionally uses the simplest possible representation to avoid any errors
 */
export class NetworkPlayerCharacter extends GameObject {
    // Static counter to help generate unique IDs
    private static instanceCount = 0;
    
    // Simple colored box for visual representation
    private readonly NETWORK_PLAYER_COLOR = 0x3498db; // Blue color for network players
    private nameTag: THREE.Sprite | null = null;
    private playerId: string = '';
    
    /**
     * Creates a new NetworkPlayerCharacter
     * @param initialPosition The initial position
     */
    constructor(initialPosition: THREE.Vector3) {
        const safePosition = new THREE.Vector3();
        // Use safe coordinates or default to origin
        safePosition.x = isFinite(initialPosition.x) ? initialPosition.x : 0;
        safePosition.y = isFinite(initialPosition.y) ? initialPosition.y : 0;
        safePosition.z = isFinite(initialPosition.z) ? initialPosition.z : 0;
        
        // Generate an ID based on the instance counter
        const objectId = `network_player_${NetworkPlayerCharacter.instanceCount++}`;
        
        // Initialize the base GameObject
        super({
            position: safePosition,
            materialType: MaterialType.DEFAULT,
            objectId: objectId
        });
    }
    
    /**
     * Create a very simple box mesh for the network player
     */
    protected createVisualMesh(): void {
        try {
            // Remove any existing visual mesh first
            if (this.visualMesh) {
                // Remove any name tag if it exists
                this.removeNameTag();
                
                // Dispose of all children and the mesh itself
                this.disposeVisualMesh();
            }
            
            // Create a simple box geometry (1x2x1 units)
            const boxGeometry = new THREE.BoxGeometry(1, 2, 1);
            const material = new THREE.MeshBasicMaterial({ 
                color: this.NETWORK_PLAYER_COLOR,
                wireframe: false
            });
            
            // Create the mesh
            const boxMesh = new THREE.Mesh(boxGeometry, material);
            
            // Create a group to hold the mesh and apply transforms
            this.visualMesh = new THREE.Group();
            this.visualMesh.add(boxMesh);
            
            // Position the mesh at the initial position
            this.visualMesh.position.set(
                this.position.x,
                this.position.y,
                this.position.z
            );
            
            // Make the mesh visible
            this.visualMesh.visible = true;
            
            // Add a special property to identify it as a network player
            (this.visualMesh as any).isNetworkPlayer = true;
            
            // If we have a player ID, create the name tag
            if (this.playerId) {
                this.createNameTag();
            }
        } catch (error) {
            console.error("Error creating network player visual mesh:", error);
        }
    }
    
    /**
     * Dispose of the current visual mesh and all its resources
     */
    private disposeVisualMesh(): void {
        if (!this.visualMesh) return;
        
        // First remove the name tag if it exists
        this.removeNameTag();
        
        // Then dispose all children
        while (this.visualMesh.children.length > 0) {
            const child = this.visualMesh.children[0];
            this.visualMesh.remove(child);
            
            // If it's a mesh, dispose of its geometry and material
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        }
        
        // Clear the visual mesh reference without using null/undefined
        // (this code is only executed during recreation of the mesh, so it's safe)
        // @ts-ignore - We're intentionally removing this before creating a new one
        this.visualMesh = null;
    }
    
    /**
     * Create a simplified collision mesh for remote players
     */
    protected createCollisionMesh(): void {
        // Skip collision mesh for now to reduce complexity
        // This is a deliberate simplification to avoid errors
    }
    
    /**
     * Remove any existing name tag
     */
    private removeNameTag(): void {
        if (!this.nameTag || !this.visualMesh) return;
        
        console.log(`NetworkPlayerCharacter: Removing name tag for ${this.getId()}`);
        
        // Remove from the visual mesh
        this.visualMesh.remove(this.nameTag);
        
        // Dispose resources
        if (this.nameTag.material) {
            const material = this.nameTag.material as THREE.SpriteMaterial;
            if (material.map) material.map.dispose();
            material.dispose();
        }
        
        // Clear reference
        this.nameTag = null;
    }
    
    /**
     * Create a simple name tag sprite
     */
    private createNameTag(): void {
        // First, make sure any existing name tag is removed
        this.removeNameTag();
        
        // If no visual mesh, can't create a name tag
        if (!this.visualMesh) {
            console.warn(`NetworkPlayerCharacter: Cannot create name tag - visualMesh is null for ${this.getId()}`);
            return;
        }
        
        console.log(`NetworkPlayerCharacter: Creating name tag for ${this.getId()} with playerId: ${this.playerId}`);
        
        try {
            // Create a canvas for the name tag
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                console.error(`NetworkPlayerCharacter: Failed to get 2D context for name tag canvas for ${this.getId()}`);
                return;
            }
            
            // Set canvas dimensions
            canvas.width = 256;
            canvas.height = 64;
            
            // Fill with transparent background
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Set text properties
            context.font = '24px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // Use the playerId directly
            let displayName = this.playerId || 'Unknown';
            console.log(`NetworkPlayerCharacter: Setting name tag text to "${displayName}" for ${this.getId()}`);
            
            // Draw text outline
            context.strokeStyle = 'black';
            context.lineWidth = 3;
            context.strokeText(displayName, canvas.width / 2, canvas.height / 2);
            
            // Draw text
            context.fillStyle = 'white';
            context.fillText(displayName, canvas.width / 2, canvas.height / 2);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false
            });
            
            // Create sprite
            this.nameTag = new THREE.Sprite(material);
            this.nameTag.scale.set(2, 0.5, 1);
            this.nameTag.position.set(0, 1.5, 0); // Position above the box
            
            // Add to visual mesh
            this.visualMesh.add(this.nameTag);
            console.log(`NetworkPlayerCharacter: Name tag added to visual mesh for ${this.getId()}`);
        } catch (error) {
            console.error(`Error creating name tag for ${this.getId()}:`, error);
        }
    }
    
    /**
     * Set the network player ID
     */
    public setNetworkPlayerId(id: string): void {
        if (this.playerId === id) return; // Don't update if ID hasn't changed
        
        console.log(`NetworkPlayerCharacter: Setting player ID from ${this.playerId} to ${id} for ${this.getId()}`);
        this.playerId = id;
        
        // Create/update the name tag
        if (this.visualMesh) {
            // Always recreate the name tag when ID changes
            this.createNameTag();
        }
    }
    
    /**
     * Override setId to extract and set the player ID
     */
    public setId(objectId: string): void {
        super.setId(objectId);
        
        // Extract player ID if in the format "network_player_<id>"
        const prefix = "network_player_";
        if (objectId.startsWith(prefix)) {
            // Store the original server ID
            const extractedId = objectId.substring(prefix.length);
            console.log(`NetworkPlayerCharacter: Extracted ID ${extractedId} from ${objectId}`);
            this.setNetworkPlayerId(extractedId);
        }
    }
    
    /**
     * Set the position of the network player
     * @param position New position
     */
    public setPosition(position: THREE.Vector3): void {
        try {
            // Create a safe position vector
            const safePosition = new THREE.Vector3(
                isFinite(position.x) ? position.x : this.position.x,
                isFinite(position.y) ? position.y : this.position.y,
                isFinite(position.z) ? position.z : this.position.z
            );
            
            console.log(`NetworkPlayerCharacter: Applying position for ${this.getId()}:`, safePosition);
            
            // Update base position
            super.setPosition(safePosition);
            
            // Update visual mesh position directly
            if (this.visualMesh) {
                this.visualMesh.position.copy(safePosition);
            } else {
                console.warn(`NetworkPlayerCharacter: Cannot update mesh position for ${this.getId()} - mesh is null`);
            }
        } catch (error) {
            console.error("Error setting position:", error);
        }
    }
    
    /**
     * Set the rotation of the network player
     * @param quaternion New rotation
     */
    public setRotation(quaternion: THREE.Quaternion): void {
        try {
            // Only apply if we have a visual mesh
            if (this.visualMesh) {
                // Validate quaternion components
                const x = isFinite(quaternion.x) ? quaternion.x : 0;
                const y = isFinite(quaternion.y) ? quaternion.y : 0;
                const z = isFinite(quaternion.z) ? quaternion.z : 0;
                const w = isFinite(quaternion.w) ? quaternion.w : 1;
                
                // Apply rotation
                this.visualMesh.quaternion.set(x, y, z, w);
                this.visualMesh.quaternion.normalize();
            }
        } catch (error) {
            console.error("Error setting rotation:", error);
        }
    }
    
    /**
     * Set target position for the network player
     * @param position The target position
     */
    public setTargetPosition(position: THREE.Vector3): void {
        // Directly set the position - no interpolation for simplicity
        this.setPosition(position);
    }
    
    /**
     * Set target rotation for the network player
     * @param quaternion The target rotation
     */
    public setTargetRotation(quaternion: THREE.Quaternion): void {
        // Directly set the rotation - no interpolation for simplicity
        this.setRotation(quaternion);
    }
    
    /**
     * Empty velocity setter to maintain interface compatibility
     */
    public setVelocity(options: { x?: number; y?: number; z?: number } = {}): void {
        // Intentionally left empty
    }
    
    /**
     * Empty interpolation speed setter to maintain interface compatibility
     */
    public setInterpolationSpeed(speed: number): void {
        // Intentionally left empty
    }
    
    /**
     * Update method required by GameObject - intentionally minimal
     * @param deltaTime Time since last update
     */
    public update(deltaTime: number): void {
        // Important: Ensure the visual mesh is positioned correctly
        if (this.visualMesh) {
            // Make sure the mesh is at the correct position
            if (!this.visualMesh.position.equals(this.position)) {
                this.visualMesh.position.copy(this.position);
            }
        }
        
        // Don't call super.update() to avoid matrix transformations we don't need
    }
}
