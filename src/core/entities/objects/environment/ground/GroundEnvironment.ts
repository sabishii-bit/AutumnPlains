import * as THREE from 'three';
import GameObject from '../../GameObject';
import * as CANNON from 'cannon-es';

export class GroundEnvironment extends GameObject {
    private groundMaterial: CANNON.Material;
    private isVisible: boolean = true;

    /**
     * Create a ground environment
     * @param initialPosition Position of the ground
     * @param visible Whether the ground should be visible (default: true)
     */
    constructor(initialPosition: THREE.Vector3, visible: boolean = false) {
        super(initialPosition); // Call to parent constructor
        this.groundMaterial = new CANNON.Material("groundMaterial"); // Initialize the ground material
        this.groundMaterial.restitution = 0.0; // Ensure no bounce on the ground material
        this.setGroundAsDefaultMaterial();
        
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
        const shape = new CANNON.Plane();
        this.collisionMesh = new CANNON.Body({
            mass: 0,
            shape: shape,
            material: this.groundMaterial, // Use the initialized ground material
        });
        this.collisionMesh.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.worldContext.addBody(this.collisionMesh);
    }

    private setGroundAsDefaultMaterial() {
        this.worldContext.defaultMaterial = this.groundMaterial; // Set the ground material as the default for the world
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
