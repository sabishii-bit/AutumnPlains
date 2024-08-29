import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject from '../GameObject';
import { CharacterState } from './character_state/CharacterState';
import StateManager from './character_state/StateManager';
import { GameObjectManager } from '../../GameObjectManager';
import { CharacterIdleState } from './character_state/CharacterIdleState';

export abstract class BaseCharacter extends GameObject {
    public jumpHeight!: number;
    public moveSpeed!: number;
    public direction!: THREE.Vector3;
    private currentState!: CharacterState;
    public canJump!: boolean;
    private characterMaterial: CANNON.Material;

    constructor(initialPosition: THREE.Vector3) { 
        super(initialPosition);
        this.characterMaterial = new CANNON.Material('characterMaterial');
        StateManager.decideState(this);
    }

    protected createVisualMesh() {
        const geometry = new THREE.SphereGeometry(2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.visualMesh = new THREE.Mesh(geometry, material);
    }

    protected createCollisionMesh() {
        if (!this.collisionMesh) {
            const radius = 2;
            this.collisionMesh = new CANNON.Body({
                mass: 5,
                position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
                shape: new CANNON.Sphere(radius),
                linearDamping: 0.9,
                angularDamping: 1,
            });
            this.worldContext.addBody(this.collisionMesh);
            this.collisionMesh.addEventListener("collide", () => {
                this.canJump = true;
                console.log("Collision detected.")
            });
        }
    }
    
    public abstract updatePosition(deltaTime: number, inputVector: THREE.Vector3): void;
    public abstract jump(): void;

    public animate(deltaTime: number): void {
        // Custom animation logic for the player character, if any
        StateManager.decideState(this);

        // Sync the visual mesh with the physics body
        if (this.collisionMesh) {
            // Convert CANNON.Vec3 to THREE.Vector3
            this.visualMesh.position.set(
                this.collisionMesh.position.x,
                this.collisionMesh.position.y,
                this.collisionMesh.position.z
            );

            // Convert the quaternion (rotation)
            this.visualMesh.quaternion.set(
                this.collisionMesh.quaternion.x,
                this.collisionMesh.quaternion.y,
                this.collisionMesh.quaternion.z,
                this.collisionMesh.quaternion.w
            );
        }
    }

    public getCurrentState(): CharacterState {
        return this.currentState;
    }

    public setState(newState: CharacterState): void {
        this.currentState = newState;
    }
}
