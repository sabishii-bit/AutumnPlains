import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import GameObject from '../GameObject';
import { BaseCharacter } from './BaseCharacter';
import StateManager from './character_state/StateManager';

export class PlayerCharacter extends BaseCharacter {
    public static instance: PlayerCharacter | null = null;
    public jumpHeight: number = 20.0;
    public moveSpeed: number = 10.0;
    public canJump: boolean = true;
    public direction: THREE.Vector3 = new THREE.Vector3();

    private constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        super(initialPosition);
    }

    public static getInstance(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): PlayerCharacter {
        if (!PlayerCharacter.instance) {
            PlayerCharacter.instance = new PlayerCharacter(initialPosition);
        }
        return PlayerCharacter.instance;
    }

    public updatePosition(deltaTime: number, inputVector: THREE.Vector3): void {
        if (this.collisionMesh) {
            this.collisionMesh.velocity.x = inputVector.x * this.moveSpeed;
            this.collisionMesh.velocity.z = inputVector.z * this.moveSpeed;
            super.update(0);
        }
    }

    public jump() {
        this.collisionMesh.velocity.y = this.jumpHeight;
    }
}
