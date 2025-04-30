import * as THREE from 'three';
import GameObject, { GameObjectOptions } from '../../GameObject';
import { MaterialType } from '../../../../physics/PhysicsMaterialsManager';
import { WorldContext } from '../../../../global/world/WorldContext';

// Declare Ammo global
declare const Ammo: any;

export class CubeProp extends GameObject {
    
    constructor(initialPosition: THREE.Vector3) {
        super({ 
            position: initialPosition,
            materialType: MaterialType.DYNAMIC
        });
    }

    protected createVisualMesh() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        this.visualMesh = new THREE.Mesh(geometry, material);
    }

    protected createCollisionMesh() {
        const Ammo = WorldContext.getAmmo();
        // Create an Ammo box shape (half-extents)
        const halfExtents = new Ammo.btVector3(1, 1, 1);
        const shape = new Ammo.btBoxShape(halfExtents);
        
        // Create the rigid body with dynamic mass
        this.collisionMesh = this.createPhysicsBody({
            mass: 1,
            shape: shape,
            position: this.position,
            restitution: 0.4,
            friction: 0.5
        });
        
        // Activate the body
        this.activate(true);
        
        // Clean up the half extents object
        Ammo.destroy(halfExtents);
    }

    animate(deltaTime: number): void {
        // No need to manually update rotation - physics engine handles this
        // The syncMeshWithBody method in GameObject will update the visual mesh
    }
}
