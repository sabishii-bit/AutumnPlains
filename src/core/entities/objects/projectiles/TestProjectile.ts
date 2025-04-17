import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import BaseProjectile from './BaseProjectile';
import { GameObjectOptions } from '../GameObject';

export class TestProjectile extends BaseProjectile {
    private rayLine!: THREE.Line;
    private lineGeometry!: THREE.BufferGeometry;
    private lineMaterial!: THREE.LineBasicMaterial;
    private isActive: boolean = false;
    private visualDistance: number = 100; // For visualization purposes only

    constructor(options: GameObjectOptions = {}) {
        super(options);
        
        // Configure collision filtering to ignore player character (group 4)
        this.collisionFilterGroup = 2; // Any group other than the player's group
        this.ignoreCollisionGroup(4); // Ignore player character group
    }
    /**
     * Checks if the projectile is active (visible and in use)
     * @returns Whether the projectile is active
     */
    public checkActive(): boolean {
        return this.isActive && this.visualMesh.visible;
    }

    /**
     * Creates a simple red line for the ray visual
     */
    protected createVisualMesh(): void {
        // Create points for the line (start and end based on direction)
        const points = [
            this.origin,
            this.origin.clone().add(this.direction.clone().multiplyScalar(this.visualDistance))
        ];
        
        // Create line geometry
        this.lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create a brighter, more visible material with wider line
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff3333,    // Brighter red
            linewidth: 5,       // Thicker line (note: not all browsers support linewidth > 1)
            opacity: 1.0,       // Fully opaque
            transparent: false  // No transparency
        });
        
        // Create the line mesh
        this.rayLine = new THREE.Line(this.lineGeometry, this.lineMaterial);
        
        // Create a group to hold the line
        const group = new THREE.Group();
        group.add(this.rayLine);
        
        // Set as the visual mesh
        this.visualMesh = group;
        
        // Initially hide the ray
        this.visualMesh.visible = false;
    
    }

    /**
     * No collision handling needed for this test ray
     */
    protected createCollisionMesh(): void {
        // No collision body needed for a simple visual ray
    }
    
    /**
     * Fire the test projectile
     */
    public fire(): void {
        
        // Update from camera to get latest position and direction
        this.updateFromCamera();
        
        // Log ray information before firing
        console.log(`[TestProjectile] Firing ray from: (${this.origin.x.toFixed(2)}, ${this.origin.y.toFixed(2)}, ${this.origin.z.toFixed(2)})`);
        console.log(`[TestProjectile] Direction: (${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}, ${this.direction.z.toFixed(2)})`);
        console.log(`[TestProjectile] Visual distance: ${this.visualDistance}`);
        
        // Perform physics raycast to detect collisions
        const hitDistance = this.performCollisionDetection();
        
        // Create endpoint based on raycast result
        let endPoint;
        
        if (hitDistance !== null) {
            // If we hit something, set the endpoint to the hit position
            endPoint = this.origin.clone().add(this.direction.clone().multiplyScalar(hitDistance));
        } else {
            // If no hit, use the visual distance for rendering
            endPoint = this.origin.clone().add(this.direction.clone().multiplyScalar(this.visualDistance));
        }
        
        // Update ray geometry with actual hit distance
        const points = [
            this.origin.clone(), // Make sure to clone to avoid reference issues
            endPoint.clone()     // Clone end point too
        ];
        
        try {
            // Make sure we have geometry and lines set up properly
            if (!this.lineGeometry || !this.rayLine) {
                console.log("Recreating line geometry and ray line");
                
                // Create line geometry
                this.lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                
                // Create material if needed
                if (!this.lineMaterial) {
                    this.lineMaterial = new THREE.LineBasicMaterial({
                        color: 0xff3333,    // Brighter red
                        linewidth: 5,       // Thicker line
                        opacity: 1.0,       // Fully opaque
                        transparent: false  // No transparency
                    });
                }
                
                // Create the line mesh
                this.rayLine = new THREE.Line(this.lineGeometry, this.lineMaterial);
                
                // Replace the visual mesh with a new group
                if (this.visualMesh) {
                    // Remove the old mesh from the scene
                    if (this.visualMesh.parent) {
                        this.visualMesh.parent.remove(this.visualMesh);
                    }
                }
                
                // Create a new group
                const group = new THREE.Group();
                group.add(this.rayLine);
                
                // Set as the visual mesh
                this.visualMesh = group;
                
                // Add to scene if needed
                if (this.sceneContext) {
                    this.sceneContext.add(this.visualMesh);
                }
                
                console.log("Created new ray visual");
            } else {
                // Update the existing geometry
                this.lineGeometry.setFromPoints(points);
                this.lineGeometry.computeBoundingSphere();
                this.lineGeometry.computeBoundingBox();
                
                // Force geometry update
                this.lineGeometry.attributes.position.needsUpdate = true;
                
                console.log("Updated existing ray visual");
            }
            
            // Ensure the visual is visible
            if (this.visualMesh) {
                this.visualMesh.visible = true;
                console.log("Ray visual set to visible");
            } else {
                console.error("Visual mesh is null after setup");
            }
            
            this.isActive = true;
            
            // Process hit information
            this.processHitResult(endPoint);
            
        } catch (error) {
            console.error("Error firing test projectile:", error);
        }
    }
    
    /**
     * Process the hit result and log appropriate information
     */
    private processHitResult(endPoint: THREE.Vector3): void {
        // Log hit information if there was a collision
        if (this.hitPosition && this.hitObject) {
            // Change color to yellow at hit point for visual feedback
            if (this.lineMaterial) {
                this.lineMaterial.color.set(0xffff00);
            }
            
            // Calculate and log hit information
            const distance = this.origin.distanceTo(this.hitPosition);
            
            // Log detailed hit information
            console.log(`%c[TestProjectile] HIT DETECTED!`, 'color: yellow; font-weight: bold');
            console.log(`  Hit position: (${this.hitPosition.x.toFixed(2)}, ${this.hitPosition.y.toFixed(2)}, ${this.hitPosition.z.toFixed(2)})`);
            console.log(`  Hit distance: ${distance.toFixed(2)} units`);
            
            // Hit body information
            console.log(`  Hit object details:`);
            console.log(`    - ID: ${this.hitObject.id}`);
            console.log(`    - Type: ${this.hitObject.type === 1 ? 'DYNAMIC' : this.hitObject.type === 2 ? 'STATIC' : 'KINEMATIC'}`);
            console.log(`    - Mass: ${this.hitObject.mass}`);
            console.log(`    - Position: (${this.hitObject.position.x.toFixed(2)}, ${this.hitObject.position.y.toFixed(2)}, ${this.hitObject.position.z.toFixed(2)})`);
            
            // Material info if available
            if (this.hitObject.material) {
                console.log(`    - Material: ${this.hitObject.material.name || 'Unnamed'}`);
                console.log(`    - Friction: ${this.hitObject.material.friction}`);
                console.log(`    - Restitution: ${this.hitObject.material.restitution}`);
            }
            
            // Shape info
            if (this.hitObject.shapes.length > 0) {
                console.log(`    - Shape count: ${this.hitObject.shapes.length}`);
                console.log(`    - Shape types: ${this.hitObject.shapes.map(shape => {
                    // Use string comparisons to avoid type issues
                    const shapeType = shape.type;
                    if (shapeType === CANNON.Shape.types.BOX) return 'Box';
                    if (shapeType === CANNON.Shape.types.SPHERE) return 'Sphere';
                    if (shapeType === CANNON.Shape.types.PLANE) return 'Plane';
                    if (shapeType === CANNON.Shape.types.CONVEXPOLYHEDRON) return 'Convex';
                    if (shapeType === CANNON.Shape.types.HEIGHTFIELD) return 'Heightfield';
                    if (shapeType === CANNON.Shape.types.TRIMESH) return 'Trimesh';
                    if (shapeType === CANNON.Shape.types.CYLINDER) return 'Cylinder';
                    return 'Unknown';
                }).join(', ')}`);
            }
            
            // Try to identify the GameObject associated with this physics body
            try {
                // Check for custom properties that might identify the object
                const anyBody = this.hitObject as any; // Use type assertion for custom properties
                if (anyBody.userData && anyBody.userData.objectId) {
                    console.log(`    - Associated GameObject ID: ${anyBody.userData.objectId}`);
                }
            } catch (error) {
                console.log(`    - Could not retrieve GameObject info: ${error}`);
            }
            
            // Log collision groups
            console.log(`    - Collision group: ${this.hitObject.collisionFilterGroup}`);
            console.log(`    - Collision mask: ${this.hitObject.collisionFilterMask}`);
            
            // Visual separator for readability
            console.log('%c-----------------------------------', 'color: gray');
        } else {
            // No hit detected
            console.log(`%c[TestProjectile] NO HIT`, 'color: red');
            console.log(`  Ray did not hit anything`);
            console.log(`  Visualizing ray to distance: ${this.visualDistance} units`);
            console.log(`  End point: (${endPoint.x.toFixed(2)}, ${endPoint.y.toFixed(2)}, ${endPoint.z.toFixed(2)})`);
            
            // Reset to red if no hit
            if (this.lineMaterial) {
                this.lineMaterial.color.set(0xff0000);
            }
        }
    }
    
    /**
     * Deactivate the ray (hide it)
     */
    public deactivate(): void {
        // Hide the visual mesh
        if (this.visualMesh) {
            this.visualMesh.visible = false;
            
            // Ensure the line goes back to default color
            if (this.lineMaterial) {
                this.lineMaterial.color.set(0xff3333);
            }
            
            // Log deactivation for debugging
            console.log('TestProjectile deactivated');
        }
        
        // Reset active state
        this.isActive = false;
    }
    
    /**
     * Override update to handle ray lifetime
     */
    public update(deltaTime: number): void {
        super.update(deltaTime);
        
        if (this.isActive) {
            // For a persistent ray, you can remove this or
            // add a timer to deactivate it after some time
        }
    }
    
    /**
     * Set the color of the ray
     */
    public setColor(color: THREE.Color | number | string): void {
        if (this.lineMaterial) {
            this.lineMaterial.color.set(color);
        }
    }

    /**
     * Set the visual distance for rendering (does not affect collision detection)
     */
    public setVisualDistance(distance: number): void {
        this.visualDistance = distance;
    }
    
    /**
     * Get the visual distance for rendering
     */
    public getVisualDistance(): number {
        return this.visualDistance;
    }
} 