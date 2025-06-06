import * as THREE from 'three';
import GameObject, { GameObjectOptions, AmmoBodyOptions } from '../../GameObject';
import { MaterialType } from '../../../../physics/PhysicsMaterialsManager';
import { WorldContext } from '../../../../global/world/WorldContext';
import { AmmoUtils } from '../../../../physics/AmmoUtils';

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
        
        // Ensure position is set correctly
        this.visualMesh.position.copy(this.position);
        
        console.log("Ground visual mesh created with rotation", this.visualMesh.rotation);
    }

    protected createCollisionMesh() {
        try {
            const Ammo = WorldContext.getAmmo();
            
            // Create a transform for the ground
            const transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(this.position.x, this.position.y, this.position.z));
            
            // Create the ground plane shape
            // The normal for the plane (pointing up)
            const planeNormal = new Ammo.btVector3(0, 1, 0);
            // The plane constant (distance from origin)
            const planeConstant = 0;
            
            // Create a static plane shape
            const groundShape = new Ammo.btStaticPlaneShape(planeNormal, planeConstant);
            
            // Create the motion state from the transform
            const motionState = new Ammo.btDefaultMotionState(transform);
            
            // Zero mass means static object
            const mass = 0;
            
            // Create an empty local inertia vector
            const localInertia = new Ammo.btVector3(0, 0, 0);
            
            // Create rigid body with the ground material
            const bodyOptions: AmmoBodyOptions = {
                mass: mass,
                shape: groundShape
            };
            
            // Create physics body with the physicsManager to apply the right material
            this.collisionMesh = this.createPhysicsBody(bodyOptions, MaterialType.GROUND);
            
            // Set specific collision group and mask for better jumping detection
            this.collisionMesh.setCollisionFlags(this.collisionMesh.getCollisionFlags() | 1); // CF_STATIC_OBJECT
            
            // Clean up Ammo.js objects
            Ammo.destroy(planeNormal);
            Ammo.destroy(localInertia);
            
            console.log("Ground collision mesh created successfully", {
                position: this.position,
                material: this.materialType
            });
        } catch (error) {
            console.error("Error creating ground collision mesh:", error);
        }
    }
    
    /**
     * Override the syncMeshWithBody method to prevent automatic syncing
     * for the ground plane. We need to maintain the visual rotation regardless
     * of the physics body orientation.
     */
    protected syncMeshWithBody() {
        // For the ground plane, we don't want to sync the rotation from physics
        // We only sync the position if needed
        if (this.collisionMesh && this.visualMesh) {
            try {
                const Ammo = WorldContext.getAmmo();
                // Create a transform to hold the rigid body's position
                const transform = new Ammo.btTransform();
                // Get the transform from the motion state
                const motionState = this.collisionMesh.getMotionState();
                if (motionState) {
                    motionState.getWorldTransform(transform);
                }
                
                // Only sync position, not rotation
                const origin = transform.getOrigin();
                if (origin) {
                    this.visualMesh.position.set(origin.x(), origin.y(), origin.z());
                }
                
                // Clean up transform
                Ammo.destroy(transform);
            } catch (error) {
                console.error(`Error in syncMeshWithBody for ground:`, error);
            }
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
