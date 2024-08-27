import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import GameObject from '../GameObject';

export class PlayerCharacter extends GameObject {
    public static instance: PlayerCharacter | null = null;
    public jumpHeight: number = 20.0;
    public moveSpeed: number = 1000.0;
    public canJump: boolean = true;
    public direction: THREE.Vector3 = new THREE.Vector3();  // Direction vector moved here

    private constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        super(initialPosition);
        this.createVisualMesh();
        this.createCollisionMesh();
    }

    public static getInstance(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): PlayerCharacter {
        if (!PlayerCharacter.instance) {
            PlayerCharacter.instance = new PlayerCharacter(initialPosition);
        }
        return PlayerCharacter.instance;
    }

    protected createVisualMesh() {
        const geometry = new THREE.SphereGeometry(2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
    }

    protected createCollisionMesh() {
        // Ensure that only one body is created
        if (!this.collisionBody) {
            const radius = 2;
            this.collisionBody = new CANNON.Body({
                mass: 5,
                position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
                shape: new CANNON.Sphere(radius),
                linearDamping: 0.9,
                angularDamping: 1
            });
            this.worldContext.addBody(this.collisionBody);
            this.collisionBody.addEventListener("collide", () => {
                this.canJump = true;
            });
        }
    }

    public updatePosition(deltaTime: number, inputVector: THREE.Vector3) {
        if (!inputVector.equals(new THREE.Vector3(0, 0, 0))) {
            inputVector.normalize().multiplyScalar(this.moveSpeed * deltaTime);
            this.collisionBody.velocity.x = inputVector.x;
            this.collisionBody.velocity.z = inputVector.z;
        }
    }

    public jump() {
        if (this.canJump) {
            this.collisionBody.velocity.y = this.jumpHeight;
            this.canJump = false;
        }
    }

    public animate(deltaTime: number): void {
        // Custom animation logic for the player character, if any
    }
}
