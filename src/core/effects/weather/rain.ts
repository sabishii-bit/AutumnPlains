import * as THREE from 'three';
import { GameObjectManager } from '../../entities/gameObjectManager';
import { ParticleSystem } from '../particleSystem';
import { Ground } from '../../entities/objects/ground/ground';
import { Vector3 } from 'three';

export class RainEffect extends ParticleSystem {
    private gameObjectManager: GameObjectManager;
    private ceilingHeight: number;
    private spread: number;
    private centerPosition: THREE.Vector3;

    constructor(
        particleCount: number = 10000,
        particleSpeed: number = 15,
        ceilingHeight: number = 100,
        spread: number = 100,
        centerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
    ) {
        super(
            particleCount,
            particleSpeed,
            { color: 0xaaaaaa, size: 0.1, transparent: true } // material options
        );
        this.gameObjectManager = new GameObjectManager();
        this.ceilingHeight = ceilingHeight;
        this.spread = spread;
        this.centerPosition = centerPosition;

        // Initialize particle positions
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.createParticlePositions(), 3));
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

    public update(deltaTime: number) {
        const positions = this.particleGeometry.attributes.position.array as Float32Array;
        const speed = this.particleSpeed * deltaTime;

        const gameObjects = this.gameObjectManager.getAllGameObjects();

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3 + 1] -= speed; // Move particles downward

            // Check for collisions with game objects
            for (const gameObject of gameObjects) {
                if (!(gameObject instanceof Ground)) continue; // Ignore objects that are not instances of Ground

                const boundingBox = new THREE.Box3().setFromObject(gameObject.getMesh());
                const particlePosition = new THREE.Vector3(
                    positions[i * 3],
                    positions[i * 3 + 1],
                    positions[i * 3 + 2]
                );

                if (boundingBox.min.y.toFixed(4) <= particlePosition.y.toFixed(4) && boundingBox.max.y.toFixed(4) >= particlePosition.y.toFixed(4)) {
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
    }
}
