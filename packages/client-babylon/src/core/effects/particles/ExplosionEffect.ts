import { Scene, Vector3, Color4 } from '@babylonjs/core';
import { BaseParticleEffect } from './BaseParticleEffect';

/**
 * Explosion effect
 * Bright burst with fire colors
 */
export class ExplosionEffect extends BaseParticleEffect {
    constructor(scene: Scene) {
        super(scene, 'Explosion');
        this.duration = 0.8;
    }

    protected setupParticleSystem(): void {
        const ps = this.particleSystem;

        // Particle capacity
        ps.capacity = 200;

        // Emission (burst)
        ps.emitRate = 500;
        ps.manualEmitCount = 200;

        // Particle size
        ps.minSize = 0.2;
        ps.maxSize = 0.8;

        // Particle lifetime
        ps.minLifeTime = 0.2;
        ps.maxLifeTime = 0.8;

        // Emission shape (sphere burst)
        ps.createSphereEmitter(0.5);

        // Particle colors (fire: yellow -> orange -> red -> smoke)
        ps.color1 = new Color4(1, 1, 0.5, 1); // Bright yellow
        ps.color2 = new Color4(1, 0.5, 0, 1); // Orange
        ps.colorDead = new Color4(0.2, 0.2, 0.2, 0); // Dark smoke fade out

        // Particle velocity (fast explosive burst)
        ps.minEmitPower = 5;
        ps.maxEmitPower = 15;
        ps.updateSpeed = 0.01;

        // Gravity (particles fall after explosion)
        ps.gravity = new Vector3(0, -2, 0);

        // No texture
        ps.particleTexture = null;

        // Additive blend for bright fire
        ps.blendMode = 2; // ALPHA_ADD
    }
}
