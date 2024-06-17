import * as THREE from 'three';
import { SceneContext } from '../global/scene/scene';
import { Renderer } from '../engine/render/renderer';
import { ParticleSystemManager } from './particleManager';

export abstract class ParticleSystem {
    protected particleGeometry: THREE.BufferGeometry;
    protected particleMaterial: THREE.PointsMaterial;
    protected particles: THREE.Points;
    protected scene: THREE.Scene = SceneContext.getInstance();
    protected renderer: THREE.WebGLRenderer = Renderer.getInstance().getRenderer();
    protected particleCount: number;
    protected particleSpeed: number;
    private particleSystemManager: ParticleSystemManager = new ParticleSystemManager();

    constructor(particleCount: number, particleSpeed: number, materialOptions: THREE.PointsMaterialParameters) {
        this.particleCount = particleCount;
        this.particleSpeed = particleSpeed;

        this.particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] = Math.random() * 500 - 250; // x
            positions[i * 3 + 1] = Math.random() * 500;   // y
            positions[i * 3 + 2] = Math.random() * 500 - 250; // z
        }

        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.particleMaterial = new THREE.PointsMaterial(materialOptions);

        this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);

        // Add the particle system to the manager
        this.particleSystemManager.addParticleSystem(this);

        this.updateSize();
    }

    public abstract update(deltaTime: number): void;

    public updateSize() {
        this.particleGeometry.setDrawRange(0, this.particleCount);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public getParticles(): THREE.Points {
        return this.particles;
    }
}
