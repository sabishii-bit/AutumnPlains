import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Scene, Vector3 } from 'three';
import { WorldContext } from '../../global/world/WorldContext';
import { SceneContext } from '../../global/scene/SceneContext';
import { generateUUID } from 'three/src/math/MathUtils';
import { GameObjectManager } from '../GameObjectManager';
import { PlayerCharacter } from './characters/PlayerCharacter';

export default abstract class GameObject {
    protected visualMesh: THREE.Mesh;
    protected collisionMesh!: CANNON.Body;
    protected position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    protected rotation: THREE.Vector3 | null = null;
    protected worldContext: CANNON.World = WorldContext.getInstance();
    protected sceneContext: Scene = SceneContext.getInstance();
    protected gameObjectManager: GameObjectManager | null = null;
    protected objectId: string = "";
    private wireframeMesh: THREE.LineSegments | null = null;
    private isWireframeVisible: boolean = false;

    constructor(
            initialPosition: THREE.Vector3 | undefined = undefined, 
            objectId: string = "", 
            visualMeshOptions: THREE.Mesh | undefined = undefined, 
            collisionMeshOptions: CANNON.Body | undefined = undefined
        ) {
        // Initialize mesh with a simple placeholder
        this.visualMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0, 0, 0), // Placeholder geometry
            new THREE.MeshBasicMaterial() // Placeholder material
        );
        // If there is no initial position, default to center axes
        if (initialPosition)
            this.setPosition(initialPosition);
        else
            this.setPosition(new THREE.Vector3(0,0,0));
        
        // Apply translation to the object's visual mesh
        this.visualMesh.position.copy(this.position);

        // If an ID wasn't assigned to the object, give it one
        if (!objectId)
            this.objectId = generateUUID();

        // Setup the object's mesh, use options parameters if they were passed
        this.createVisualMesh();
        this.createCollisionMesh();
        this.addObjectToCollection();
        this.addToScene();
    }

    // Abstract method to create the visual part of the object
    protected abstract createVisualMesh(): void;

    // Abstract method to create the physics part of the object
    protected abstract createCollisionMesh(): void;

    public setPosition(position: Vector3): void {
        this.position = position;
    }

    public getMesh() {
        return this.visualMesh;
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

        scene.add(this.visualMesh);
        if (this.collisionMesh) {
            // Initial synchronization
            this.syncMeshWithBody();
        }
    }

    public getCollisionBody(): CANNON.Body {
        return this.collisionMesh;
    }
    
    public update(deltaTime: number): void {
        // Sync mesh with the physics body
        if (this.collisionMesh) {
            this.syncMeshWithBody();
        }

        // Call abstract animate method which can be overridden by subclasses
        this.animate(deltaTime);
    }

    protected syncMeshWithBody() {
        if (this.collisionMesh) {

            // Convert CANNON.Vec3 to THREE.Vector3
            const position = new THREE.Vector3(
                this.collisionMesh.position.x,
                this.collisionMesh.position.y,
                this.collisionMesh.position.z
            );
    
            // Synchronize the visual mesh's position and rotation with the physics body's
            this.visualMesh.position.copy(position);
            
            // Convert the quaternion (rotation) as well
            const quaternion = new THREE.Quaternion(
                this.collisionMesh.quaternion.x,
                this.collisionMesh.quaternion.y,
                this.collisionMesh.quaternion.z,
                this.collisionMesh.quaternion.w
            );
            this.visualMesh.quaternion.copy(quaternion);
    
            // Sync wireframe position and rotation with the main mesh if wireframe is enabled
            if (this.wireframeMesh) {
                this.wireframeMesh.position.copy(this.visualMesh.position);
                this.wireframeMesh.quaternion.copy(this.visualMesh.quaternion);
            }
        }
    }

    private addObjectToCollection(): void {
        if (this.gameObjectManager == null) {
            this.gameObjectManager = new GameObjectManager();
        }
        this.gameObjectManager.addGameObject(this);
    }

    public getID(): string {
        return this.objectId;
    }

    protected animate(deltaTime: number): void {
        // Default animate logic (if any), can be overridden in subclasses
    }

    // Create wireframe based on the existing mesh
    public createCollisionMeshWireframe(): void {
        if (!this.wireframeMesh) {
            const wireframeGeometry = new THREE.WireframeGeometry(this.visualMesh.geometry);
            const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            this.wireframeMesh = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
            this.wireframeMesh.position.copy(this.visualMesh.position);
            this.wireframeMesh.quaternion.copy(this.visualMesh.quaternion);
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
