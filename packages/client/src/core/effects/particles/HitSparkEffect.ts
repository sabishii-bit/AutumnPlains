import { Scene, Vector3, Color4, Texture } from '@babylonjs/core';
import { BaseParticleEffect } from './BaseParticleEffect';

/**
 * Spark effect for projectile hits
 * Quick burst of bright particles
 */
export class HitSparkEffect extends BaseParticleEffect {
    constructor(scene: Scene) {
        super(scene, 'HitSpark');
        this.duration = 0.3; // Short duration for impact
    }

    protected setupParticleSystem(): void {
        const ps = this.particleSystem;

        // Particle capacity
        ps.capacity = 50;

        // Emission
        ps.emitRate = 200;
        ps.manualEmitCount = 50; // Burst all particles at once

        // Particle size
        ps.minSize = 0.05;
        ps.maxSize = 0.15;

        // Particle lifetime
        ps.minLifeTime = 0.1;
        ps.maxLifeTime = 0.3;

        // Emission shape (sphere)
        ps.createSphereEmitter(0.2); // Small radius burst

        // Particle colors (bright yellow to orange)
        ps.color1 = new Color4(1, 1, 0, 1); // Yellow
        ps.color2 = new Color4(1, 0.5, 0, 1); // Orange
        ps.colorDead = new Color4(0.5, 0, 0, 0); // Fade to red

        // Particle velocity
        ps.minEmitPower = 2;
        ps.maxEmitPower = 5;
        ps.updateSpeed = 0.01;

        // Gravity
        ps.gravity = new Vector3(0, -9.81, 0);

        // No texture - use solid color particles
        ps.particleTexture = null;

        // Blend mode for bright sparks
        ps.blendMode = 2; // ALPHA_ADD for bright particles
    }
}
