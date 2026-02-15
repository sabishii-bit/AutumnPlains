import { Scene, Vector3, Color4 } from '@babylonjs/core';
import { BaseParticleEffect } from './BaseParticleEffect';

/**
 * Smoke effect
 * Rising gray smoke particles
 */
export class SmokeEffect extends BaseParticleEffect {
    constructor(scene: Scene) {
        super(scene, 'Smoke');
        this.duration = 2.0; // Longer smoke effect
    }

    protected setupParticleSystem(): void {
        const ps = this.particleSystem;

        // Particle capacity
        ps.capacity = 100;

        // Emission
        ps.emitRate = 30;

        // Particle size (grow over time)
        ps.minSize = 0.3;
        ps.maxSize = 0.5;
        ps.minScaleX = 1;
        ps.maxScaleX = 2;
        ps.minScaleY = 1;
        ps.maxScaleY = 2;

        // Particle lifetime
        ps.minLifeTime = 1.0;
        ps.maxLifeTime = 2.0;

        // Emission shape (cone pointing up)
        ps.createConeEmitter(0.2, Math.PI / 6); // Small radius, narrow cone

        // Particle colors (gray smoke)
        ps.color1 = new Color4(0.3, 0.3, 0.3, 0.8);
        ps.color2 = new Color4(0.5, 0.5, 0.5, 0.6);
        ps.colorDead = new Color4(0.2, 0.2, 0.2, 0); // Fade out

        // Particle velocity (slow upward movement)
        ps.minEmitPower = 0.5;
        ps.maxEmitPower = 1.5;
        ps.updateSpeed = 0.01;

        // Direction (upward)
        ps.direction1 = new Vector3(-0.2, 1, -0.2);
        ps.direction2 = new Vector3(0.2, 1, 0.2);

        // Slight gravity to simulate air resistance
        ps.gravity = new Vector3(0, 0.5, 0);

        // No texture - use solid color
        ps.particleTexture = null;

        // Blend mode for transparent smoke
        ps.blendMode = 0; // ALPHA_COMBINE
    }
}
