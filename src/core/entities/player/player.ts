import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class Player {
    public jumpHeight: number = 20.0;
    public body: CANNON.Body;
    public moveSpeed: number = 1000.0;
    public canJump: boolean = true;
    private worldContext: CANNON.World;

    constructor(world: CANNON.World, initialPosition: CANNON.Vec3 = new CANNON.Vec3(0, 10, 20)) {
        this.worldContext = world;
        const mass = 5;
        const radius = 2;
        this.body = new CANNON.Body({
            mass,
            position: initialPosition,
            shape: new CANNON.Sphere(radius),
            material: this.worldContext.defaultMaterial,  // Use default material from the world context
            linearDamping: 0.9,
            angularDamping: 1
        });
        world.addBody(this.body);
        this.body.addEventListener("collide", (event) => {
            this.canJump = true; // Reset jump ability when the player collides with something solid
        });
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
