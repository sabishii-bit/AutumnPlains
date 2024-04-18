import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject from '../gameObject';

export class Wall extends GameObject {
    private width: number;
    private height: number;
    private depth: number;

    constructor(world: CANNON.World | null = null, initialPosition: THREE.Vector3, width: number = 10, height: number = 3, depth: number = 1) {
        super(world, initialPosition);
        this.width = width;
        this.height = height;
        this.depth = depth;

        this.createVisual();
        if (world) {
            this.createPhysics(world);
        }
    }

    protected createVisual() {
        // Create a box geometry based on the dimensions provided
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF }); // White color for the wall
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
    }

    protected createPhysics(world: CANNON.World) {
        // Create a box shape with half-extents
        const halfExtents = new CANNON.Vec3(this.width / 2, this.height / 2, this.depth / 2);
        const shape = new CANNON.Box(halfExtents);
        this.body = new CANNON.Body({
            mass: 0, // Static body since it's a wall
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            shape: shape
        });
        world.addBody(this.body);
    }
}
