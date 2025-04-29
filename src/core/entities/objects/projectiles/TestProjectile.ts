import * as THREE from 'three';
import BaseProjectile from './BaseProjectile';
import { GameObjectOptions } from '../GameObject';

export class TestProjectile extends BaseProjectile {
    
    private rayLine!: THREE.Line;
    private lineGeometry!: THREE.BufferGeometry;
    private lineMaterial!: THREE.LineBasicMaterial;
    private isActive: boolean = false;
    private visualDistance: number = 100; // For visualization purposes only
    private hitColor: THREE.Color = new THREE.Color(0x00ff00); // Green for hits
    private missColor: THREE.Color = new THREE.Color(0xff3333); // Red for misses

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
        
        // Check for collisions
        const hasHit = this.checkCollisions();
        
        // Determine end point based on hit
        let endPoint;
        
        if (hasHit && this.hitPosition) {
            // If we hit something, set the end point to the hit position
            endPoint = this.hitPosition;
            // Set hit color (green)
            this.setColor(this.hitColor);
            
            // Enhanced hit object logging
            if (this.hitObject) {
                const hitObjId = this.hitObject.getId();
                const hitObjType = this.hitObject.constructor.name;
                const hitObjPos = this.hitObject.getPosition();
                
                console.log(`%c[TestProjectile] Hit Details`, 'color: #00ff00; font-weight: bold');
                console.log(`  Hit Object ID: ${hitObjId}`);
                console.log(`  Object Type: ${hitObjType}`);
                console.log(`  Object Position: (${hitObjPos.x.toFixed(2)}, ${hitObjPos.y.toFixed(2)}, ${hitObjPos.z.toFixed(2)})`);
                console.log(`  Hit Position: (${this.hitPosition.x.toFixed(2)}, ${this.hitPosition.y.toFixed(2)}, ${this.hitPosition.z.toFixed(2)})`);
                console.log(`  Hit Distance: ${this.origin.distanceTo(this.hitPosition).toFixed(2)} units`);
                
                // Display hit normal if available
                const hitNormal = this.getHitNormal();
                if (hitNormal) {
                    console.log(`  Hit Normal: (${hitNormal.x.toFixed(2)}, ${hitNormal.y.toFixed(2)}, ${hitNormal.z.toFixed(2)})`);
                    
                    // Determine which face was hit based on the normal
                    let face = "Unknown";
                    const threshold = 0.7; // Threshold for determining primary direction
                    
                    if (Math.abs(hitNormal.y) > threshold) {
                        face = hitNormal.y > 0 ? "TOP" : "BOTTOM";
                    } else if (Math.abs(hitNormal.x) > threshold) {
                        face = hitNormal.x > 0 ? "RIGHT" : "LEFT";
                    } else if (Math.abs(hitNormal.z) > threshold) {
                        face = hitNormal.z > 0 ? "FRONT" : "BACK";
                    }
                    
                    console.log(`  Hit Face: ${face}`);
                }
                
                // Try to get the material if available
                const body = this.hitObject.getCollisionBody();
                if (body && body.material) {
                    console.log(`  Physics Material: ${body.material.name || 'unnamed'}`);
                }
            } else {
                // We have a hit but couldn't find the corresponding GameObject
                console.log(`%c[TestProjectile] Hit detected but no GameObject found`, 'color: orange; font-weight: bold');
                
                // Show what we do know about the hit
                console.log(`  Hit Position: (${this.hitPosition.x.toFixed(2)}, ${this.hitPosition.y.toFixed(2)}, ${this.hitPosition.z.toFixed(2)})`);
                console.log(`  Hit Distance: ${this.origin.distanceTo(this.hitPosition).toFixed(2)} units`);
                
                const hitNormal = this.getHitNormal();
                if (hitNormal) {
                    console.log(`  Hit Normal: (${hitNormal.x.toFixed(2)}, ${hitNormal.y.toFixed(2)}, ${hitNormal.z.toFixed(2)})`);
                    
                    // Try to identify what was hit based on the normal and position
                    if (Math.abs(hitNormal.y) > 0.9 && Math.abs(this.hitPosition.y) < 0.2) {
                        console.log(`  %cLikely hit the ground plane`, 'color: #88ff88');
                    } else if (this.origin.distanceTo(this.hitPosition) < 2.0) {
                        console.log(`  %cLikely hit part of the player character`, 'color: #ff8888');
                    }
                }
            }
        } else {
            // If we didn't hit anything, use default distance
            endPoint = this.origin.clone().add(this.direction.clone().multiplyScalar(this.visualDistance));
            // Set miss color (red)
            this.setColor(this.missColor);
            console.log(`[TestProjectile] No hit detected`);
        }
        
        // Update ray geometry
        const points = [
            this.origin.clone(),
            endPoint.clone()
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
        // Calculate the actual distance between origin and endpoint
        const actualDistance = this.origin.distanceTo(endPoint);
        
        console.log(`%c[TestProjectile] Ray Visualization`, 'color: green; font-weight: bold');
        console.log(`  Origin: (${this.origin.x.toFixed(2)}, ${this.origin.y.toFixed(2)}, ${this.origin.z.toFixed(2)})`);
        console.log(`  Direction: (${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}, ${this.direction.z.toFixed(2)})`);
        console.log(`  End point: (${endPoint.x.toFixed(2)}, ${endPoint.y.toFixed(2)}, ${endPoint.z.toFixed(2)})`);
        console.log(`  Distance: ${actualDistance.toFixed(2)} units`);
        
        // Add ray hit status info
        if (this.hitObject) {
            console.log(`  Hit Status: %cHIT`, 'color: #00ff00; font-weight: bold');
            console.log(`  Target: ${this.hitObject.constructor.name} (ID: ${this.hitObject.getId()})`);
            
            // Use the hit normal if available
            const hitNormal = this.getHitNormal();
            if (hitNormal) {
                let face = "Unknown";
                const threshold = 0.7; // Threshold for determining primary direction
                
                if (Math.abs(hitNormal.y) > threshold) {
                    face = hitNormal.y > 0 ? "TOP" : "BOTTOM";
                } else if (Math.abs(hitNormal.x) > threshold) {
                    face = hitNormal.x > 0 ? "RIGHT" : "LEFT";
                } else if (Math.abs(hitNormal.z) > threshold) {
                    face = hitNormal.z > 0 ? "FRONT" : "BACK";
                }
                
                console.log(`  Hit Surface: ${face} (based on normal)`);
                console.log(`  Surface Normal: (${hitNormal.x.toFixed(2)}, ${hitNormal.y.toFixed(2)}, ${hitNormal.z.toFixed(2)})`);
            } else {
                // Fallback to estimate based on ray direction
                const rayDir = this.direction.clone().normalize();
                
                // Try to estimate which side was hit based on ray direction
                if (Math.abs(rayDir.y) > Math.abs(rayDir.x) && Math.abs(rayDir.y) > Math.abs(rayDir.z)) {
                    // Mostly vertical hit
                    console.log(`  Hit Surface: ${rayDir.y < 0 ? 'TOP' : 'BOTTOM'} (estimated)`);
                } else if (Math.abs(rayDir.x) > Math.abs(rayDir.z)) {
                    // Mostly on x-axis
                    console.log(`  Hit Surface: ${rayDir.x < 0 ? 'RIGHT' : 'LEFT'} (estimated)`);
                } else {
                    // Mostly on z-axis
                    console.log(`  Hit Surface: ${rayDir.z < 0 ? 'FRONT' : 'BACK'} (estimated)`);
                }
            }
        } else {
            console.log(`  Hit Status: %cMISS`, 'color: #ff3333; font-weight: bold');
        }
        
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

    protected createCollisionMesh(): void {
        // No collision body needed for a simple visual ray
    }
} 