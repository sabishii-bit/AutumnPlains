import { Scene, Vector3, Color3, MeshBuilder, LinesMesh, Ray } from '@babylonjs/core';
import { Entity } from '../Entity';
import { ParticleEffectManager } from '../../effects/particles/ParticleEffectManager';
import { HitSparkEffect } from '../../effects/particles/HitSparkEffect';
import { DustEffect } from '../../effects/particles/DustEffect';

/**
 * Test projectile - visual raycast for debugging
 * Similar to the old client's TestProjectile
 * Shows a colored line indicating hit/miss
 */
export class TestProjectile extends Entity {
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
        visualDuration: number = 2.0 // Show ray for 2 seconds
    ) {
        super(scene, 'TestProjectile');
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
        const hit = this.getScene().pickWithRay(ray, (mesh) => {
            // Filter out non-pickable meshes
            return mesh.isPickable && mesh.isVisible;
        });

        let actualEndPoint = endPoint;
        let didHit = false;

        if (hit && hit.hit && hit.pickedPoint) {
            actualEndPoint = hit.pickedPoint;
            didHit = true;

            console.log('%c[TestProjectile] Hit Details', 'color: #00ff00; font-weight: bold');
            console.log(`  Hit Mesh: ${hit.pickedMesh?.name || 'unknown'}`);
            console.log(`  Hit Position: (${actualEndPoint.x.toFixed(2)}, ${actualEndPoint.y.toFixed(2)}, ${actualEndPoint.z.toFixed(2)})`);
            console.log(`  Hit Distance: ${origin.subtract(actualEndPoint).length().toFixed(2)} units`);

            const normal = hit.getNormal(true);
            if (normal) {
                console.log(`  Hit Normal: (${normal.x.toFixed(2)}, ${normal.y.toFixed(2)}, ${normal.z.toFixed(2)})`);

                // Determine which face was hit
                const threshold = 0.7;
                let face = "Unknown";

                if (Math.abs(normal.y) > threshold) {
                    face = normal.y > 0 ? "TOP" : "BOTTOM";
                } else if (Math.abs(normal.x) > threshold) {
                    face = normal.x > 0 ? "RIGHT" : "LEFT";
                } else if (Math.abs(normal.z) > threshold) {
                    face = normal.z > 0 ? "FRONT" : "BACK";
                }

                console.log(`  Hit Face: ${face}`);
            }
            console.log('%c-----------------------------------', 'color: gray');

            // Spawn hit particle effects
            this.spawnHitEffect(actualEndPoint);
        } else {
            console.log('%c[TestProjectile] No hit detected (MISS)', 'color: #ff3333; font-weight: bold');
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
            this.line = null;
        }

        // Create new line
        const points = [start, end];
        this.line = MeshBuilder.CreateLines(
            'testProjectileLine',
            { points, updatable: false },
            this.getScene()
        );

        // Set color based on hit/miss
        const color = didHit ? this.hitColor : this.missColor;
        this.line.color = color;

        // Make it visible and bright
        this.line.isPickable = false;
        this.line.renderingGroupId = 1; // Render on top of other objects
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

    /**
     * Spawn particle effect at hit location
     */
    private spawnHitEffect(position: Vector3): void {
        const particleManager = ParticleEffectManager.getInstance();

        // Spawn spark effect
        const spark = particleManager.getEffect(HitSparkEffect);
        spark.play(position);

        // Spawn dust effect
        const dust = particleManager.getEffect(DustEffect);
        dust.play(position);
    }

    public dispose(): void {
        if (this.line) {
            this.line.dispose();
            this.line = null;
        }
        super.dispose();
    }
}
