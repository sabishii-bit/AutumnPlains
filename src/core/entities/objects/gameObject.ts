import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Scene, Vector3 } from 'three';
import { WorldContext } from '../../global/world/world';
import { GameObjectManager } from "../gameObjectManager";
import { SceneContext } from '../../global/scene/scene';
import { generateUUID } from 'three/src/math/MathUtils';

export default abstract class GameObject {
    protected mesh: THREE.Mesh;
    protected body: CANNON.Body | null = null;
    protected position: THREE.Vector3;
    protected rotation: THREE.Vector3;
    protected worldContext: CANNON.World = WorldContext.getInstance();
    protected sceneContext: Scene = SceneContext.getInstance();
    protected gameObjectManager: GameObjectManager;
    protected objectId: string;

    constructor(initialPosition: THREE.Vector3) {
        // Initialize mesh with a simple placeholder
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1), // Placeholder geometry
            new THREE.MeshBasicMaterial({ color: 0xff0000 }) // Placeholder material
        );
        if (!initialPosition)
            this.setPosition(initialPosition);
        else
            this.position = initialPosition;
        
        this.mesh.position.copy(this.position);
        this.objectId = generateUUID();

        this.createVisual();
        this.createPhysics();
        this.addObjectToCollection();
    }

    // Abstract method to create the visual part of the object
    protected abstract createVisual(): void;

    // Abstract method to create the physics part of the object
    protected abstract createPhysics(): void;

    public setPosition(position: Vector3): void {
        this.position = position;
    }

    public getPosition(): THREE.Vector3 {
        return this.position;
    }

    public addToScene(scene?: THREE.Scene) {
        
        if (!scene) {
            scene = this.sceneContext;
        }

        scene.add(this.mesh);
        if (this.body) {
            // Initial synchronization
            this.syncMeshWithBody();
        }
    }

    public getBody(): CANNON.Body {
        return this.body;
    }
    
    public update(deltaTime: number): void {
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

    protected addObjectToCollection(): void {
        this.gameObjectManager = new GameObjectManager();
        this.gameObjectManager.addGameObject(this);
    }

    public getID(): string {
        return this.objectId;
    }

    animate(deltaTime: number): void {
        // Default animate logic (if any), can be overridden in subclasses
    }
}
