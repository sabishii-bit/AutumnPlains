import * as THREE from 'three';

// Declare Ammo global
declare const Ammo: any;

/**
 * Debug drawer for Ammo.js physics visualization
 * Implements Ammo.btIDebugDraw interface to render physics shapes in Three.js
 */
export class AmmoDebugDrawer {
    private scene: THREE.Scene;
    private debugDrawer: any; // The btIDebugDraw implementation
    private debugMode: number = 0;
    private lines: THREE.LineSegments;
    private lineGeometry: THREE.BufferGeometry;
    private lineMaterial: THREE.LineBasicMaterial;
    private positions: Float32Array;
    private colors: Float32Array;
    private maxVertices: number;
    private vertexCount: number = 0;

    /**
     * Create a new debug drawer for visualizing physics bodies
     * @param scene THREE.js scene to add debug lines to
     * @param maxVertices Maximum number of vertices for debug drawing
     */
    constructor(scene: THREE.Scene, maxVertices: number = 10000) {
        this.scene = scene;
        this.maxVertices = maxVertices;

        // Create lines geometry for debug drawing
        this.positions = new Float32Array(maxVertices * 3); // 3 coordinates per vertex
        this.colors = new Float32Array(maxVertices * 3); // 3 color components per vertex
        
        this.lineGeometry = new THREE.BufferGeometry();
        this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        
        this.lineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            depthTest: true,
            linewidth: 1,
            opacity: 0.8,
            transparent: true
        });
        
        this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
        this.lines.frustumCulled = false; // Don't cull debug lines
        
        // Add to scene
        scene.add(this.lines);
        
        // Create the actual debug drawer
        this.debugDrawer = new Ammo.DebugDrawer();
        this.debugDrawer.drawLine = this.drawLine.bind(this);
        this.debugDrawer.drawContactPoint = this.drawContactPoint.bind(this);
        this.debugDrawer.reportErrorWarning = this.reportErrorWarning.bind(this);
        this.debugDrawer.draw3dText = this.draw3dText.bind(this);
        this.debugDrawer.setDebugMode = this.setDebugMode.bind(this);
        this.debugDrawer.getDebugMode = this.getDebugMode.bind(this);
    }
    
    /**
     * Draw a line for debug visualization
     * @param from Start position of the line
     * @param to End position of the line
     * @param color Line color
     */
    private drawLine(from: any, to: any, color: any): void {
        // Make sure we don't exceed buffer size
        if (this.vertexCount + 2 > this.maxVertices) {
            // Reset if buffer is full
            this.vertexCount = 0;
        }
        
        // Set positions
        this.positions[this.vertexCount * 3] = from.x();
        this.positions[this.vertexCount * 3 + 1] = from.y();
        this.positions[this.vertexCount * 3 + 2] = from.z();
        
        this.positions[this.vertexCount * 3 + 3] = to.x();
        this.positions[this.vertexCount * 3 + 4] = to.y();
        this.positions[this.vertexCount * 3 + 5] = to.z();
        
        // Set colors
        this.colors[this.vertexCount * 3] = color.x();
        this.colors[this.vertexCount * 3 + 1] = color.y();
        this.colors[this.vertexCount * 3 + 2] = color.z();
        
        this.colors[this.vertexCount * 3 + 3] = color.x();
        this.colors[this.vertexCount * 3 + 4] = color.y();
        this.colors[this.vertexCount * 3 + 5] = color.z();
        
        this.vertexCount += 2;
        
        // Mark attributes as needing update
        this.lineGeometry.attributes.position.needsUpdate = true;
        this.lineGeometry.attributes.color.needsUpdate = true;
    }
    
    /**
     * Draw a contact point for debug visualization
     * @param point Contact point position
     * @param normal Contact normal
     * @param distance Penetration distance
     * @param lifetime Contact lifetime
     * @param color Contact color
     */
    private drawContactPoint(point: any, normal: any, distance: number, lifetime: number, color: any): void {
        // Draw a small line representing the contact normal
        const from = new Ammo.btVector3(
            point.x(),
            point.y(),
            point.z()
        );
        
        const to = new Ammo.btVector3(
            point.x() + normal.x() * distance,
            point.y() + normal.y() * distance,
            point.z() + normal.z() * distance
        );
        
        this.drawLine(from, to, color);
        
        // Clean up
        Ammo.destroy(from);
        Ammo.destroy(to);
    }
    
    /**
     * Report an error or warning from the physics engine
     * @param warningString Error/warning message
     */
    private reportErrorWarning(warningString: string): void {
        console.warn(`Ammo Debug: ${warningString}`);
    }
    
    /**
     * Draw 3D text for debug visualization (not implemented)
     * @param location Text position
     * @param textString Text to display
     */
    private draw3dText(location: any, textString: string): void {
        // 3D text isn't easy in Three.js, so we'll just log it
        console.log(`Ammo 3D Text at (${location.x()}, ${location.y()}, ${location.z()}): ${textString}`);
    }
    
    /**
     * Set the debug draw mode
     * @param mode Bit flags for debug visualization options
     */
    private setDebugMode(mode: number): void {
        this.debugMode = mode;
    }
    
    /**
     * Get the current debug draw mode
     * @returns Current debug mode bit flags
     */
    private getDebugMode(): number {
        return this.debugMode;
    }
    
    /**
     * Update the debug drawer (clears old lines)
     */
    public update(): void {
        // Reset vertex count to clear old lines
        this.vertexCount = 0;
        
        // Mark attributes as needing update
        this.lineGeometry.attributes.position.needsUpdate = true;
        this.lineGeometry.attributes.color.needsUpdate = true;
        
        // Update draw range
        this.lineGeometry.setDrawRange(0, this.vertexCount);
    }
    
    /**
     * Get the Ammo.js debug drawer implementation
     * @returns Ammo.btIDebugDraw implementation
     */
    public getDebugDrawer(): any {
        return this.debugDrawer;
    }
    
    /**
     * Set the visibility of the debug visualization
     * @param visible Whether to show debug visualization
     */
    public setVisible(visible: boolean): void {
        this.lines.visible = visible;
    }
    
    /**
     * Toggle the visibility of the debug visualization
     * @returns New visibility state
     */
    public toggleVisibility(): boolean {
        this.lines.visible = !this.lines.visible;
        return this.lines.visible;
    }
    
    /**
     * Set the debug mode for physics visualization
     * @param mode Debug mode flags (combination of constants from Ammo.js)
     * Constants:
     * - 0: No debug
     * - 1: Draw wireframe
     * - 2: Draw AABB
     * - 4: Draw features
     * - 8: Draw normals
     * - 16: Draw frames
     * - 32: Draw constraints
     * - 64: Draw constraint limits
     * - 128: Fast wireframe
     */
    public setDebugDrawMode(mode: number): void {
        this.debugDrawer.setDebugMode(mode);
    }
    
    /**
     * Clean up resources
     */
    public destroy(): void {
        this.scene.remove(this.lines);
        this.lineGeometry.dispose();
        this.lineMaterial.dispose();
    }
} 