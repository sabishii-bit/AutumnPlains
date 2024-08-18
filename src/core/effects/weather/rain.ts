import * as THREE from 'three';
import { GameObjectManager } from '../../entities/gameObjectManager';
import { ParticleSystem } from '../particleSystem';
import { Ground } from '../../entities/objects/environment/ground/ground';

export class RainEffect extends ParticleSystem {
    private gameObjectManager: GameObjectManager;
    private ceilingHeight: number;
    private spread: number;
    private centerPosition: THREE.Vector3;
    private raindropMesh: THREE.InstancedMesh;
    private raindropGeometry: THREE.BufferGeometry;
    private raindropMaterial: THREE.MeshBasicMaterial;

    constructor(
        particleCount: number = 15000,
        particleSpeed: number = 30,
        ceilingHeight: number = 100,
        spread: number = 100,
        centerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
    ) {
        // Pass an invisible material to the ParticleSystem base class to avoid rendering points
        super(
            particleCount,
            particleSpeed,
            { color: 0x000000, size: 0, transparent: true, visible: false }
        );
        this.gameObjectManager = new GameObjectManager();
        this.ceilingHeight = ceilingHeight;
        this.spread = spread;
        this.centerPosition = centerPosition;

        // Set default raindrop shape and material
        this.raindropMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
        this.setRaindropShape('rectangle');

        // Initialize particle positions
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.createParticlePositions(), 3));
    }

    // Method to set the geometry of the raindrops based on the chosen shape
    public setRaindropShape(shape: string) {
        // Remove existing raindrop meshes from the scene
        if (this.raindropMesh) {
            this.scene.remove(this.raindropMesh);
        }

        let geometry: THREE.BufferGeometry;

        switch (shape) {
            case 'cube':
                geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.05, 8, 8);
                break;
            case 'rectangle':
                geometry = new THREE.BoxGeometry(0.01, 0.5, 0.01);
                break;
            default:
                console.warn(`Unknown shape: ${shape}. Defaulting to cube.`);
                geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        }

        this.raindropGeometry = geometry;
        this.createParticleMeshes();
    }

    protected createParticlePositions(): Float32Array {
        const positions = new Float32Array(this.particleCount * 3);
        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.x; // x
            positions[i * 3 + 1] = Math.random() * this.ceilingHeight + this.centerPosition.y; // y
            positions[i * 3 + 2] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.z; // z
        }
        return positions;
    }

    protected createParticleMeshes() {
        // Create an invisible material for the points
        const invisibleMaterial = new THREE.MeshBasicMaterial({ visible: false });

        this.raindropMesh = new THREE.InstancedMesh(this.raindropGeometry, this.raindropMaterial, this.particleCount);

        const positions = this.particleGeometry.attributes.position.array as Float32Array;
        const matrix = new THREE.Matrix4();

        for (let i = 0; i < this.particleCount; i++) {
            matrix.setPosition(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
            this.raindropMesh.setMatrixAt(i, matrix);
        }

        this.scene.add(this.raindropMesh);
    }

    public update(deltaTime: number) {
        const positions = this.particleGeometry.attributes.position.array as Float32Array;
        const speed = this.particleSpeed * deltaTime;

        const gameObjects = this.gameObjectManager.getAllGameObjects();
        const matrix = new THREE.Matrix4();

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3 + 1] -= speed; // Move particles downward

            // Update raindrop mesh position
            matrix.setPosition(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
            this.raindropMesh.setMatrixAt(i, matrix);

            // Check for collisions with game objects
            for (const gameObject of gameObjects) {
                if (!(gameObject instanceof Ground)) continue;

                const boundingBox = new THREE.Box3().setFromObject(gameObject.getMesh());
                const particlePosition = new THREE.Vector3(
                    positions[i * 3],
                    positions[i * 3 + 1],
                    positions[i * 3 + 2]
                );

                if (boundingBox.min.y <= particlePosition.y && boundingBox.max.y >= particlePosition.y) {
                    // Reset particle position if collision detected
                    positions[i * 3] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.x; // Reset x position
                    positions[i * 3 + 1] = Math.random() * this.ceilingHeight + this.centerPosition.y; // Reset y position
                    positions[i * 3 + 2] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.z; // Reset z position
                    break;
                }
            }

            // Reset position if the particle goes below a certain threshold
            if (positions[i * 3 + 1] < -100) {
                positions[i * 3] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.x; // Reset x position
                positions[i * 3 + 1] = Math.random() * this.ceilingHeight + this.centerPosition.y; // Reset y position
                positions[i * 3 + 2] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.z; // Reset z position
            }
        }

        this.particleGeometry.attributes.position.needsUpdate = true;
        this.raindropMesh.instanceMatrix.needsUpdate = true;
    }
}
