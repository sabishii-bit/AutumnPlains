import { SceneContext } from "../global/scene/SceneContext";
import { ParticleSystem } from './ParticleSystem';
import * as THREE from 'three';

export class ParticleSystemManager {
    private static particleSystemsCollection: ParticleSystem[] = [];
    private scene: THREE.Scene = SceneContext.getInstance();

    constructor() {}

    public addParticleSystem(particleSystem: ParticleSystem): void {
        ParticleSystemManager.particleSystemsCollection.push(particleSystem);
        this.scene.add(particleSystem.getParticles());
    }

    public update(deltaTime: number): void {
        ParticleSystemManager.particleSystemsCollection.forEach(ps => ps.update(deltaTime));
    }

    public removeParticleSystem(particleSystem: ParticleSystem): void {
        const index = ParticleSystemManager.particleSystemsCollection.indexOf(particleSystem);
        if (index !== -1) {
            ParticleSystemManager.particleSystemsCollection.splice(index, 1);
            this.scene.remove(particleSystem.getParticles());
        }
    }

    public getParticleSystems(): ParticleSystem[] {
        return ParticleSystemManager.particleSystemsCollection;
    }
}
