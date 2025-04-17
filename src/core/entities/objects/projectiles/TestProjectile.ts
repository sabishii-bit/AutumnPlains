import * as THREE from 'three';
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
     * Fire the test projectile
     */
    public fire(): void {
        // Update from camera to get latest position and direction
        this.updateFromCamera();
        
        // Log ray information before firing
        console.log(`[TestProjectile] Firing ray from: (${this.origin.x.toFixed(2)}, ${this.origin.y.toFixed(2)}, ${this.origin.z.toFixed(2)})`);
        console.log(`[TestProjectile] Direction: (${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}, ${this.direction.z.toFixed(2)})`);
        console.log(`[TestProjectile] Visual distance: ${this.visualDistance}`);
        
        // Create endpoint for the ray visualization
        const endPoint = this.origin.clone().add(this.direction.clone().multiplyScalar(this.visualDistance));
        
        // Update ray geometry
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
            
            // Log ray information
            this.logRayInfo(endPoint);
            
        } catch (error) {
            console.error("Error firing test projectile:", error);
        }
    }
    
    /**
     * Log ray information
     */
    private logRayInfo(endPoint: THREE.Vector3): void {
        console.log(`%c[TestProjectile] Ray Visualization`, 'color: green; font-weight: bold');
        console.log(`  Origin: (${this.origin.x.toFixed(2)}, ${this.origin.y.toFixed(2)}, ${this.origin.z.toFixed(2)})`);
        console.log(`  Direction: (${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}, ${this.direction.z.toFixed(2)})`);
        console.log(`  End point: (${endPoint.x.toFixed(2)}, ${endPoint.y.toFixed(2)}, ${endPoint.z.toFixed(2)})`);
        console.log(`  Distance: ${this.visualDistance} units`);
        console.log('%c-----------------------------------', 'color: gray');
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
     * Set the visual distance for rendering
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