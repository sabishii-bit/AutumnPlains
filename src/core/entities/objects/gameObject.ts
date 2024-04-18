import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Scene } from 'three';
import { WorldContext } from '../../global/world/world';
import { SceneContext } from '../../global/scene/scene';

export default abstract class GameObject {
    protected mesh: THREE.Mesh;
    protected body: CANNON.Body | null = null;
    protected position: THREE.Vector3;
    protected rotation: THREE.Vector3;
    protected worldContext: CANNON.World = WorldContext.getInstance();
    protected sceneContext: Scene = SceneContext.getInstance();

    constructor(initialPosition: THREE.Vector3) {
        // Initialize mesh with a simple placeholder
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1), // Placeholder geometry
            new THREE.MeshBasicMaterial({ color: 0xff0000 }) // Placeholder material
        );
        this.mesh.position.copy(initialPosition);
        this.position = initialPosition;

        this.createVisual();
        this.createPhysics();
        
    }

    // Abstract method to create the visual part of the object
    protected abstract createVisual(): void;

    // Abstract method to create the physics part of the object
    protected abstract createPhysics(): void;

    addToScene(scene?: THREE.Scene) {
        
        if (!scene) {
            scene = this.sceneContext;
        }

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

    protected syncMeshWithBody() {
        this.mesh.position.copy(this.body.position as any);
        this.mesh.quaternion.copy(this.body.quaternion as any);
    }

    animate(deltaTime: number): void {
        // Default animate logic (if any), can be overridden in subclasses
    }
}
