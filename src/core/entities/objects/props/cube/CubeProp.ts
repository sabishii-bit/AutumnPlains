import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject, { GameObjectOptions } from '../../GameObject';
import { MaterialType } from '../../../../materials/PhysicsMaterialsManager';

export class CubeProp extends GameObject {
    
    constructor(initialPosition: THREE.Vector3) {
        super({ 
            position: initialPosition
        });
    }

    protected createVisualMesh() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        this.visualMesh = new THREE.Mesh(geometry, material);
    }

    protected createCollisionMesh() {
        const halfExtents = new CANNON.Vec3(1, 1, 1);
        const shape = new CANNON.Box(halfExtents);
        this.collisionMesh = this.createPhysicsBody({
            mass: 1,
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
            shape: shape
        });
        this.collisionMesh.type = CANNON.Body.DYNAMIC; // Make the body dynamic
    }

    animate(deltaTime: number): void {
        // Animate rotation
        // this.visualMesh.rotation.y += deltaTime * 0.5;  // Spin at a rate of 0.5 radians per second
        // this.visualMesh.rotation.x += deltaTime * 0.5;

        // Update the body's quaternion to match the mesh's rotation
        if (this.collisionMesh) {
            this.collisionMesh.quaternion.setFromEuler(this.visualMesh.rotation.x, this.visualMesh.rotation.y, this.visualMesh.rotation.z, 'XYZ');
        }
    }
}
