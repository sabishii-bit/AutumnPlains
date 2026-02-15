import { Scene, Vector3, Color4 } from '@babylonjs/core';
import { BaseParticleEffect } from './BaseParticleEffect';

/**
 * Dust/debris effect
 * Small particles that scatter outward and fall
 */
export class DustEffect extends BaseParticleEffect {
    constructor(scene: Scene) {
        super(scene, 'Dust');
        this.duration = 1.5;
    }

    protected setupParticleSystem(): void {
        const ps = this.particleSystem;

        // Particle capacity
        ps.capacity = 80;

        // Emission
        ps.emitRate = 60;
        ps.manualEmitCount = 40; // Initial burst

        // Particle size
        ps.minSize = 0.02;
        ps.maxSize = 0.08;

        // Particle lifetime
        ps.minLifeTime = 0.5;
        ps.maxLifeTime = 1.5;

        // Emission shape (hemisphere on ground)
        ps.createHemisphericEmitter(0.3);

        // Particle colors (brown/tan dust)
        ps.color1 = new Color4(0.6, 0.5, 0.4, 1);
        ps.color2 = new Color4(0.5, 0.4, 0.3, 1);
        ps.colorDead = new Color4(0.4, 0.3, 0.2, 0); // Fade out

        // Particle velocity
        ps.minEmitPower = 1;
        ps.maxEmitPower = 3;
        ps.updateSpeed = 0.01;

        // Gravity
        ps.gravity = new Vector3(0, -5, 0);

        // No texture
        ps.particleTexture = null;

        // Blend mode
        ps.blendMode = 0; // ALPHA_COMBINE
    }
}
