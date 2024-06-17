import { SceneContext } from "../global/scene/scene";
import { Renderer } from '../engine/render/renderer';
import { ParticleSystem } from './particleSystem';
import * as THREE from 'three';

export class ParticleSystemManager {
    private static particleSystems: ParticleSystem[] = [];
    private scene: THREE.Scene = SceneContext.getInstance();
    private renderer: THREE.WebGLRenderer = Renderer.getInstance().getRenderer();

    constructor() {}

    public addParticleSystem(particleSystem: ParticleSystem): void {
        ParticleSystemManager.particleSystems.push(particleSystem);
        this.scene.add(particleSystem.getParticles());
    }

    public update(deltaTime: number): void {
        ParticleSystemManager.particleSystems.forEach(ps => ps.update(deltaTime));
    }

    public removeParticleSystem(particleSystem: ParticleSystem): void {
        const index = ParticleSystemManager.particleSystems.indexOf(particleSystem);
        if (index !== -1) {
            ParticleSystemManager.particleSystems.splice(index, 1);
            this.scene.remove(particleSystem.getParticles());
        }
    }

    public getParticleSystems(): ParticleSystem[] {
        return ParticleSystemManager.particleSystems;
    }
}
