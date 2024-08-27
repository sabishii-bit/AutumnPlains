import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Scene, Vector3 } from 'three';
import { WorldContext } from '../../global/world/WorldContext';
import { SceneContext } from '../../global/scene/SceneContext';
import { generateUUID } from 'three/src/math/MathUtils';
import { GameObjectManager } from '../GameObjectManager';

export default abstract class GameObject {
    protected mesh: THREE.Mesh;
    protected body: CANNON.Body | null = null;
    protected position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    protected rotation: THREE.Vector3 | null = null;
    protected worldContext: CANNON.World = WorldContext.getInstance();
    protected sceneContext: Scene = SceneContext.getInstance();
    protected gameObjectManager: GameObjectManager | null = null;
    protected objectId: string = "";
    private wireframeMesh: THREE.LineSegments | null = null;
    private isWireframeVisible: boolean = false;

    constructor(initialPosition: THREE.Vector3, objectId: string = "") {
        // Initialize mesh with a simple placeholder
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0, 0, 0), // Placeholder geometry
            new THREE.MeshBasicMaterial() // Placeholder material
        );
        if (initialPosition)
            this.setPosition(initialPosition);
        
        this.mesh.position.copy(this.position);

        if (!objectId)
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

    public getMesh() {
        return this.mesh;
    }

    public getId(): string {
        return this.objectId;
    }

    public setId(objectId: string) {
        this.objectId = objectId;
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

    public getBody(): CANNON.Body | null {
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
        if (this.body) {
            this.mesh.position.copy(this.body.position as any);
            this.mesh.quaternion.copy(this.body.quaternion as any);

            // Sync wireframe position and rotation with the main mesh
            if (this.wireframeMesh) {
                this.wireframeMesh.position.copy(this.mesh.position);
                this.wireframeMesh.quaternion.copy(this.mesh.quaternion);
            }
        }
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

    // Create wireframe based on the existing mesh
    public createCollisionMeshWireframe(): void {
        if (!this.wireframeMesh) {
            const wireframeGeometry = new THREE.WireframeGeometry(this.mesh.geometry);
            const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            this.wireframeMesh = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
            this.wireframeMesh.position.copy(this.mesh.position);
            this.wireframeMesh.quaternion.copy(this.mesh.quaternion);
            this.sceneContext.add(this.wireframeMesh);
        }
    }

    // Toggle the visibility of the wireframe
    public toggleWireframeVisibility(): void {
        if (this.wireframeMesh) {
            this.isWireframeVisible = !this.isWireframeVisible;
            this.wireframeMesh.visible = this.isWireframeVisible;
        }
    }
}
