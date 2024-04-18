import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Scene } from 'three';

export default abstract class GameObject {
    protected mesh: THREE.Mesh;
    protected body: CANNON.Body | null = null;
    protected position: THREE.Vector3;
    protected rotation: XYZ;

    constructor(world: CANNON.World | null = null, initialPosition: THREE.Vector3, sceneContext?: Scene, rotation: XYZ = {x: 0, y: 0, z: 0}) {
        // Initialize mesh with a simple placeholder
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1), // Placeholder geometry
            new THREE.MeshBasicMaterial({ color: 0xff0000 }) // Placeholder material
        );
        this.mesh.position.copy(initialPosition);
        this.position = initialPosition;
        this.rotation = rotation;

        if (!sceneContext)       // Some files don't require scene context, only load the ones that don't require it
            this.createVisual(); // Ensure that the visual creation is called right after mesh initialization

        if (world) {
            this.createPhysics(world, initialPosition);
        }

        this.setRotation();
    }

    // Abstract method to create the visual part of the object
    protected abstract createVisual(): void;

    // Abstract method to create the physics part of the object
    protected abstract createPhysics(world: CANNON.World, initialPosition: THREE.Vector3): void;

    addToScene(scene: THREE.Scene) {
        scene.add(this.mesh);
        if (this.body) {
            // Initial synchronization
            this.syncMeshWithBody();
        }
    }

    getBody(): CANNON.Body {
        return this.body;
    }
    
    update(deltaTime: number): void {
        // Sync mesh with the physics body
        if (this.body) {
            this.syncMeshWithBody();
        }

        // Call abstract animate method which can be overridden by subclasses
        this.animate(deltaTime);
    }

    setRotation(rotation?): void {
        if (!rotation) {
            this.mesh.rotation.x += this.rotation?.x;
            this.mesh.rotation.y += this.rotation?.y;
            this.mesh.rotation.z += this.rotation?.z;
        } else {
            this.mesh.rotation.x += rotation?.x;
            this.mesh.rotation.y += rotation?.y;
            this.mesh.rotation.z += rotation?.z;
        }
        
    }

    protected syncMeshWithBody() {
        this.mesh.position.copy(this.body.position as any);
        this.mesh.quaternion.copy(this.body.quaternion as any);
    }

    animate(deltaTime: number): void {
        // Default animate logic (if any), can be overridden in subclasses
    }
}

type XYZ = {
    x: number;
    y: number;
    z: number;
};
