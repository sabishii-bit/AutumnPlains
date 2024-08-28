import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject from '../GameObject';
import { CharacterState } from './character_state/CharacterState';
import StateManager from './character_state/StateManager';
import { GameObjectManager } from '../../GameObjectManager';

export abstract class BaseCharacter extends GameObject {
    public jumpHeight!: number;
    public moveSpeed!: number;
    public direction!: THREE.Vector3;
    private currentState!: CharacterState;
    public canJump!: boolean;
    public isColliding!: boolean;

    constructor(initialPosition: THREE.Vector3) { 
        super(initialPosition);
        this.createVisualMesh();
        this.createCollisionMesh();
        StateManager.decideState(this);
    }

    protected createVisualMesh() {
        const geometry = new THREE.SphereGeometry(2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.visualMesh = new THREE.Mesh(geometry, material);
        this.visualMesh.position.copy(this.position);
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
    public abstract animate(deltaTime: number): void;

    public getCurrentState(): CharacterState {
        return this.currentState;
    }

    public setState(newState: CharacterState): void {
        this.currentState = newState;
    }
}
