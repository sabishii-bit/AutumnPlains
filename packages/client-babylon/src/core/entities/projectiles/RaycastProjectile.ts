import { Scene, Vector3, Color3, MeshBuilder, LinesMesh, Ray } from '@babylonjs/core';
import { Entity } from '../Entity';

/**
 * Raycast projectile (hitscan weapon)
 * Instant hit detection using raycasting instead of physics
 * Useful for bullets, lasers, and other high-speed projectiles
 */
export class RaycastProjectile extends Entity {
    private line: LinesMesh | null = null;
    private maxDistance: number;
    private visualDuration: number;
    private lifetime: number = 0;
    private isActive: boolean = false;
    private hitColor: Color3 = new Color3(0, 1, 0); // Green for hits
    private missColor: Color3 = new Color3(1, 0.2, 0.2); // Red for misses

    constructor(
        scene: Scene,
        maxDistance: number = 1000,
        visualDuration: number = 0.1 // How long to show the ray
    ) {
        super(scene, 'RaycastProjectile');
        this.maxDistance = maxDistance;
        this.visualDuration = visualDuration;
    }

    /**
     * Fire a raycast from origin in direction
     */
    public fire(origin: Vector3, direction: Vector3): void {
        this.lifetime = 0;
        this.isActive = true;

        const normalizedDir = direction.normalize();
        const endPoint = origin.add(normalizedDir.scale(this.maxDistance));

        // Perform raycast
        const ray = new Ray(origin, normalizedDir, this.maxDistance);
        const hit = this.getScene().pickWithRay(ray);

        let actualEndPoint = endPoint;
        let didHit = false;

        if (hit && hit.hit) {
            actualEndPoint = hit.pickedPoint!;
            didHit = true;

            console.log(`RaycastProjectile hit ${hit.pickedMesh?.name || 'unknown'} at ${actualEndPoint}`);
            console.log(`  Distance: ${origin.subtract(actualEndPoint).length().toFixed(2)}`);
            console.log(`  Normal: ${hit.getNormal(true)}`);
        } else {
            console.log('RaycastProjectile missed');
        }

        // Create visual line
        this.createVisualLine(origin, actualEndPoint, didHit);
    }

    /**
     * Create a visual line to show the raycast
     */
    private createVisualLine(start: Vector3, end: Vector3, didHit: boolean): void {
        // Remove old line if it exists
        if (this.line) {
            this.line.dispose();
        }

        // Create new line
        const points = [start, end];
        this.line = MeshBuilder.CreateLines(
            'raycastLine',
            { points, updatable: false },
            this.getScene()
        );

        // Set color based on hit/miss
        const color = didHit ? this.hitColor : this.missColor;
        this.line.color = color;

        // Make it visible and bright
        this.line.isPickable = false;
        this.line.renderingGroupId = 1; // Render on top
    }

    public onUpdate(deltaTime: number): void {
        super.onUpdate(deltaTime);

        if (!this.isActive) return;

        this.lifetime += deltaTime;

        // Hide the line after duration
        if (this.lifetime >= this.visualDuration) {
            this.deactivate();
        }
    }

    /**
     * Deactivate and hide the raycast visual
     */
    public deactivate(): void {
        this.isActive = false;
        this.lifetime = 0;

        if (this.line) {
            this.line.dispose();
            this.line = null;
        }
    }

    /**
     * Reset for reuse
     */
    public reset(): void {
        this.deactivate();
    }

    /**
     * Check if active
     */
    public checkActive(): boolean {
        return this.isActive;
    }

    /**
     * Set visual duration
     */
    public setVisualDuration(duration: number): void {
        this.visualDuration = duration;
    }

    /**
     * Set max raycast distance
     */
    public setMaxDistance(distance: number): void {
        this.maxDistance = distance;
    }

    public dispose(): void {
        if (this.line) {
            this.line.dispose();
            this.line = null;
        }
        super.dispose();
    }
}
