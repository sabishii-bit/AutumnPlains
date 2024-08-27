import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject from '../../GameObject';

export class CubeProp extends GameObject {
    
    constructor(initialPosition: THREE.Vector3) {
        super(initialPosition);
    }

    protected createVisual() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        this.mesh = new THREE.Mesh(geometry, material);
    }

    protected createPhysics() {
        const halfExtents = new CANNON.Vec3(0.5, 0.5, 0.5);
        const shape = new CANNON.Box(halfExtents);
        this.collisionBody = new CANNON.Body({
            mass: 0, // Set mass to 0 to make the body static
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            shape: shape
        });
        this.collisionBody.type = CANNON.Body.KINEMATIC; // Make the body kinematic
        this.worldContext.addBody(this.collisionBody);
    }

    animate(deltaTime: number): void {
        // Animate rotation
        this.mesh.rotation.y += deltaTime * 0.5;  // Spin at a rate of 0.5 radians per second
        this.mesh.rotation.x += deltaTime * 0.5;

        // Update the body's quaternion to match the mesh's rotation
        if (this.collisionBody) {
            this.collisionBody.quaternion.setFromEuler(this.mesh.rotation.x, this.mesh.rotation.y, this.mesh.rotation.z, 'XYZ');
        }
    }
}
