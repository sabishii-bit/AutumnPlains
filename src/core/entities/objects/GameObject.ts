import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Scene, Vector3 } from 'three';
import { WorldContext } from '../../global/world/WorldContext';
import { SceneContext } from '../../global/scene/SceneContext';
import { generateUUID } from 'three/src/math/MathUtils';
import { GameObjectManager } from '../GameObjectManager';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { MaterialType, PhysicsMaterialsManager } from '../../materials/PhysicsMaterialsManager';
import { PlayerCharacter } from './characters/PlayerCharacter';

/**
 * Options interface for GameObject initialization
 */
export interface GameObjectOptions {
    position?: THREE.Vector3;
    objectId?: string;
    visualMeshOptions?: THREE.Mesh;
    collisionMeshOptions?: CANNON.Body;
    /**
     * Whether to automatically add the object to the scene. Default: true
     * @deprecated Use addToCollection instead which handles both scene and physics world
     */
    addToScene?: boolean;
    /**
     * Whether to automatically add the object to the GameObjectManager collection.
     * When true (default), the object will be automatically added to the scene and physics world.
     * When false, you must manually add the object using GameObjectManager.
     */
    addToCollection?: boolean;
    materialType?: MaterialType;
}

export default abstract class GameObject {
    protected visualMesh: THREE.Mesh | THREE.Group;
    protected collisionMesh!: CANNON.Body;
    protected position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    protected rotation: THREE.Vector3 | null = null;
    protected worldContext: CANNON.World = WorldContext.getInstance();
    protected sceneContext: Scene = SceneContext.getInstance();
    protected gameObjectManager: GameObjectManager = GameObjectManager.getInstance();
    protected objectId: string = "";
    protected materialType: MaterialType = MaterialType.DEFAULT;
    protected physicsManager: PhysicsMaterialsManager = PhysicsMaterialsManager.getInstance();
    private wireframeMesh: THREE.LineSegments | null = null;
    private isWireframeVisible: boolean = false;

    /**
     * Creates a new GameObject with the specified options
     * @param options Configuration options for the GameObject
     */
    constructor(options: GameObjectOptions = {}) {
        // Initialize mesh with a simple placeholder if no visualMeshOptions provided
        this.visualMesh = options.visualMeshOptions || new THREE.Mesh(
            new THREE.BoxGeometry(0, 0, 0), // Placeholder geometry
            new THREE.MeshBasicMaterial() // Placeholder material
        );
        
        // Set position
        this.setPosition(options.position || new THREE.Vector3(0, 0, 0));
        
        // Apply translation to the object's visual mesh
        this.visualMesh.position.copy(this.position);

        // Set object ID
        this.objectId = options.objectId || generateUUID();
        
        // Set material type
        if (options.materialType) {
            this.materialType = options.materialType;
        }

        // Initialize the GameObject by setting up meshes
        this.createVisualMesh();
        this.createCollisionMesh();
        
        // Auto-add to collection unless specified not to
        // Note: Some child classes (like BaseCharacter) may have special physics components
        // (such as constraints or additional bodies) that require direct world context access.
        // These special cases should be documented in the child classes.
        if (options.addToCollection !== false) {
            this.gameObjectManager.addGameObject(this);
        }
    }

    /**
     * Creates a physics body with the appropriate material
     * @param options Body options
     * @param materialType Optional override material type
     * @returns CANNON.Body with material applied
     */
    protected createPhysicsBody(options: CANNON.BodyOptions, materialType?: MaterialType): CANNON.Body {
        const type = materialType || this.materialType;
        return this.physicsManager.createBodyWithMaterial(options, type);
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
        if (!this.collisionMesh) return;
        
        try {
            // Convert CANNON.Vec3 to THREE.Vector3
            const position = new THREE.Vector3(
                this.collisionMesh.position.x,
                this.collisionMesh.position.y,
                this.collisionMesh.position.z
            );
    
            // Check for invalid values (NaN, Infinity)
            if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z) ||
                !isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) {
                console.error(`Invalid physics position detected for ${this.objectId}:`, position);
                // Prevent applying invalid positions to the visual mesh
                return;
            }
            
            // Synchronize the visual mesh's position with the physics body's
            this.visualMesh.position.copy(position);
    
            // Convert the quaternion (rotation) as well
            const quaternion = new THREE.Quaternion(
                this.collisionMesh.quaternion.x,
                this.collisionMesh.quaternion.y,
                this.collisionMesh.quaternion.z,
                this.collisionMesh.quaternion.w
            );
            
            // Check for invalid quaternion values
            if (isNaN(quaternion.x) || isNaN(quaternion.y) || isNaN(quaternion.z) || isNaN(quaternion.w) ||
                !isFinite(quaternion.x) || !isFinite(quaternion.y) || !isFinite(quaternion.z) || !isFinite(quaternion.w)) {
                console.error(`Invalid physics quaternion detected for ${this.objectId}:`, quaternion);
                // Prevent applying invalid rotation to the visual mesh
                return;
            }
            
            // Normalize the quaternion to avoid rendering issues
            quaternion.normalize();
            
            // Apply the quaternion to the visual mesh
            this.visualMesh.quaternion.copy(quaternion);
    
            // Sync wireframe position and rotation with the main mesh if wireframe is enabled
            if (this.wireframeMesh) {
                this.wireframeMesh.position.copy(this.visualMesh.position);
                this.wireframeMesh.quaternion.copy(this.visualMesh.quaternion);
            }
        } catch (error) {
            console.error(`Error in syncMeshWithBody for object ${this.objectId}:`, error);
        }
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
            // Handle visualMesh being a Group or a Mesh
            let wireframeGeometry;
            if (this.visualMesh instanceof THREE.Group) {
                // If visualMesh is a group, merge its geometries for the wireframe
                const geometries: THREE.BufferGeometry[] = [];
                this.visualMesh.children.forEach(child => {
                    if (child instanceof THREE.Mesh) {
                        geometries.push((child as THREE.Mesh).geometry);
                    }
                });
                wireframeGeometry = mergeGeometries(geometries);
            } else {
                // Otherwise, use the geometry directly
                wireframeGeometry = new THREE.WireframeGeometry((this.visualMesh as THREE.Mesh).geometry);
            }
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
