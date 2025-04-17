import * as THREE from 'three';
import GameObject, { GameObjectOptions } from '../../GameObject';
import * as CANNON from 'cannon-es';
import { MaterialType } from '../../../../materials/PhysicsMaterialsManager';

export class GroundEnvironment extends GameObject {
    private isVisible: boolean = true;

    /**
     * Create a ground environment
     * @param initialPosition Position of the ground
     * @param visible Whether the ground should be visible (default: false)
     */
    constructor(initialPosition: THREE.Vector3, visible: boolean = false) {
        super({ 
            position: initialPosition,
            materialType: MaterialType.GROUND
        });
        
        // Set initial visibility
        if (!visible) {
            this.setVisibility(false);
        }
    }

    protected createVisualMesh() {
        const geometry = new THREE.PlaneGeometry(500, 500);
        const texture = new THREE.TextureLoader().load('/assets/groundTestTexture.jpg');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);

        const material = new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
        });
        this.visualMesh = new THREE.Mesh(geometry, material); // Override the initial placeholder mesh
        this.visualMesh.rotation.x = -Math.PI / 2;
    }

    protected createCollisionMesh() {
        // Use a plane shape for the ground
        const shape = new CANNON.Plane();
        
        try {
            // Create the collision body with the ground material
            this.collisionMesh = this.createPhysicsBody({
                mass: 0,  // Static body (immovable)
                shape: shape,
                // Add small damping to help with stability
                linearDamping: 0.01,
                angularDamping: 0.01
            });
            
            // Rotate to make it face up
            this.collisionMesh.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
            
            // Set specific collision group and mask for better jumping detection
            this.collisionMesh.collisionFilterGroup = 1;  // Ground group
            this.collisionMesh.collisionFilterMask = -1;  // Collide with everything
            
            // No need to add to physics world as GameObjectManager handles this
            
            console.log("Ground collision mesh created successfully", {
                position: this.position,
                material: this.materialType
            });
        } catch (error) {
            console.error("Error creating ground collision mesh:", error);
        }
    }
    
    /**
     * Set the transparency level of the ground
     * @param opacity Value between 0 (invisible) and 1 (fully opaque)
     */
    public setTransparency(opacity: number): void {
        if (this.visualMesh instanceof THREE.Mesh) {
            const meshMaterial = this.visualMesh.material;
            if (meshMaterial instanceof THREE.MeshPhongMaterial) {
                // Ensure material is set up for transparency
                meshMaterial.transparent = true;
                meshMaterial.opacity = Math.max(0, Math.min(1, opacity));
                meshMaterial.needsUpdate = true;
                
                // Update visibility state based on opacity
                this.isVisible = opacity > 0;
                this.visualMesh.visible = this.isVisible;
            }
        }
    }
    
    /**
     * Set the visibility of the ground
     * @param visible Whether the ground should be visible
     */
    public setVisibility(visible: boolean): void {
        this.isVisible = visible;
        
        if (this.visualMesh instanceof THREE.Mesh) {
            this.visualMesh.visible = visible;
            
            const meshMaterial = this.visualMesh.material;
            if (meshMaterial instanceof THREE.MeshPhongMaterial) {
                meshMaterial.transparent = true;
                meshMaterial.opacity = visible ? 1.0 : 0.0;
                meshMaterial.needsUpdate = true;
            }
        }
    }
    
    /**
     * Toggle the ground visibility
     * @returns The new visibility state
     */
    public toggleVisibility(): boolean {
        this.setVisibility(!this.isVisible);
        return this.isVisible;
    }
    
    /**
     * Check if the ground is currently visible
     * @returns True if the ground is visible
     */
    public isGroundVisible(): boolean {
        return this.isVisible;
    }
}
