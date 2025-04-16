import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject, { GameObjectOptions } from '../../GameObject';
import { MaterialType } from '../../../../materials/PhysicsMaterialsManager';

export class WallEnvironment extends GameObject {
    private width!: number;
    private height!: number;
    private depth!: number;

    constructor(initialPosition: THREE.Vector3, width: number = 10, height: number = 10, depth: number = 1) {
        super({ 
            position: initialPosition,
            materialType: MaterialType.WALL
        });
        
        this.width = width;
        this.height = height;
        this.depth = depth;
    }

    protected createVisualMesh() {
        // Create a box geometry based on the dimensions provided
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF }); // White color for the wall
        this.visualMesh = new THREE.Mesh(geometry, material);
        this.visualMesh.position.copy(this.position);
    }

    protected createCollisionMesh() {
        // Create a box shape with half-extents
        const halfExtents = new CANNON.Vec3(this.width / 2, this.height / 2, this.depth / 2);
        const shape = new CANNON.Box(halfExtents);
        this.collisionMesh = this.createPhysicsBody({
            mass: 0, // Static body since it's a wall
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            shape: shape
        });
        this.worldContext.addBody(this.collisionMesh);
    }
}
