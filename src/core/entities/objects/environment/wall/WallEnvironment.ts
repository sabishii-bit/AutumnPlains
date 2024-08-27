import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject from '../../GameObject';

export class WallEnvironment extends GameObject {
    private width: number;
    private height: number;
    private depth: number;

    constructor(initialPosition: THREE.Vector3) {
        super(initialPosition);
    }

    protected createVisual() {
        // Create a box geometry based on the dimensions provided
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF }); // White color for the wall
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
    }

    protected createPhysics() {
        // Create a box shape with half-extents
        const halfExtents = new CANNON.Vec3(this.width / 2, this.height / 2, this.depth / 2);
        const shape = new CANNON.Box(halfExtents);
        this.collisionBody = new CANNON.Body({
            mass: 0, // Static body since it's a wall
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            shape: shape
        });
        this.worldContext.addBody(this.collisionBody);
    }
}
