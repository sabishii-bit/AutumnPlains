import * as THREE from 'three';
import { SceneContext } from '../global/scene/SceneContext';
import { Renderer } from '../engine/render/Renderer';
import { ParticleSystemManager } from './ParticleSystemManager';

export abstract class ParticleSystem {
    protected particleGeometry: THREE.BufferGeometry;
    protected particleMaterial: THREE.PointsMaterial;
    protected particles: THREE.Points;
    protected scene: THREE.Scene = SceneContext.getInstance();
    protected renderer: THREE.WebGLRenderer = Renderer.getInstance().getRenderer();
    protected particleCount: number;
    protected particleSpeed: number;
    private particleSystemManager: ParticleSystemManager = new ParticleSystemManager();


    /**
     * Creates an instance of a ParticleSystem.
     * 
     * @param particleCount - The number of particles in the system.
     * @param particleSpeed - The speed at which the particles move.
     * @param materialOptions - Options to configure the appearance of the particles.
     */
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

    /**
     * Abstract method that must be implemented by subclasses.
     * 
     * Updates the state of the particle system. Typically called once per frame.
     * 
     * @param deltaTime - The time elapsed since the last update.
     */
    public abstract update(deltaTime: number): void;

    /**
     * Updates the size and draw range of the particle system.
     * 
     * - Adjusts the draw range of the particle geometry based on `particleCount`.
     * - Resizes the renderer to match the window dimensions.
     */
    public updateSize() {
        this.particleGeometry.setDrawRange(0, this.particleCount);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Returns the Three.js Points object representing the particles.
     * 
     * @returns The Points object that contains the particle geometry and material.
     */
    public getParticles(): THREE.Points {
        return this.particles;
    }
}
