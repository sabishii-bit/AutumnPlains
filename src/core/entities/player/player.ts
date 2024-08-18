import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { WorldContext } from '../../global/world/world';

export class Player {
    private static instance: Player;
    public jumpHeight: number = 20.0;
    public body: CANNON.Body;
    public moveSpeed: number = 1000.0;
    public canJump: boolean = true;
    private worldContext: CANNON.World = WorldContext.getInstance();

    // Private constructor to enforce singleton property
    private constructor(initialPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, 0)) {
        const mass = 5;
        const radius = 2;
        this.body = new CANNON.Body({
            mass,
            position: initialPosition,
            shape: new CANNON.Sphere(radius),
            material: this.worldContext.defaultMaterial,
            linearDamping: 0.9,
            angularDamping: 1
        });
        this.worldContext.addBody(this.body);
        this.body.addEventListener("collide", () => {
            this.canJump = true; // Reset jump ability when the player collides with something solid
        });
    }

    // Static method to access the singleton instance
    public static getInstance(initialPosition: CANNON.Vec3 = new CANNON.Vec3(0, 2, 20)): Player {
        if (!Player.instance) {
            Player.instance = new Player(initialPosition);
        }
        return Player.instance;
    }

    public updatePosition(deltaTime: number, inputVector: THREE.Vector3) {
        if (!inputVector.equals(new THREE.Vector3(0, 0, 0))) {
            inputVector.normalize().multiplyScalar(this.moveSpeed * deltaTime);
            this.body.velocity.x = inputVector.x;
            this.body.velocity.z = inputVector.z;
        }
    }

    public jump() {
        if (this.canJump) {
            this.body.velocity.y = this.jumpHeight;
            this.canJump = false; // Prevent further jumps until collision
        }
    }

    public getBody(): CANNON.Body {
        return this.body;
    }
}