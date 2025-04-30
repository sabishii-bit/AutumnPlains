import { WorldContext } from "../global/world/WorldContext";
import { SceneContext } from "../global/scene/SceneContext";
import GameObject from "./objects/GameObject";
import { Scene } from "three";

// Declaration for Ammo since it's a UMD module
declare const Ammo: any;

export class GameObjectManager {
    private static instance: GameObjectManager;
    private static objectCollection: Map<string, GameObject> = new Map<string, GameObject>();
    private sceneContext: Scene = SceneContext.getInstance();
    private worldContext: any = WorldContext.getInstance(); // Ammo.btDiscreteDynamicsWorld

    constructor() {}

    /**
     * Get the singleton instance of GameObjectManager
     */
    public static getInstance(): GameObjectManager {
        if (!GameObjectManager.instance) {
            GameObjectManager.instance = new GameObjectManager();
        }
        return GameObjectManager.instance;
    }

    /**
     * Adds a GameObject to the collection and automatically adds its visual and collision
     * components to the scene and physics world.
     */
    public addGameObject(object: GameObject): void {
        const objectId = object.getID();
        if (!GameObjectManager.objectCollection.has(objectId)) {
            // Add object to collection
            GameObjectManager.objectCollection.set(objectId, object);
            
            // Add visual mesh to scene
            const mesh = object.getMesh();
            if (mesh) {
                this.sceneContext.add(mesh);
            }
            
            // Add collision body to physics world
            const body = object.getCollisionBody();
            if (body) {
                // With Ammo.js we use addRigidBody instead of addBody
                this.worldContext.addRigidBody(body);
            }
            
            // Get the class name of the object for more informative logging
            const objectType = object.constructor.name;
            console.log(`${objectType} with ID ${objectId} added to the game.`);
        } else {
            const objectType = object.constructor.name;
            console.warn(`${objectType} with ID ${objectId} already exists in the collection.`);
        }
    }

    public updateGameObjects(deltaTime: number): void {
        GameObjectManager.objectCollection.forEach(obj => { obj.update(deltaTime) });
    }

    public deleteObject(objectID: string): void {
        const object: GameObject | undefined = GameObjectManager.objectCollection.get(objectID);
        const objectMesh = object?.getMesh();
        const objectBody = object?.getCollisionBody();
        
        if (object) {
            // Get the object type for logging
            const objectType = object.constructor.name;
            
            // Remove the object's mesh from the scene
            if (objectMesh) {
                this.sceneContext.remove(objectMesh);
            }
            // Remove the object's physics body from the world
            if (objectBody) {
                // With Ammo.js we use removeRigidBody instead of removeBody
                this.worldContext.removeRigidBody(objectBody);
            }
            // Finally, remove the object from the collection
            GameObjectManager.objectCollection.delete(objectID);
            console.log(`${objectType} with ID ${objectID} has been removed.`);
        } else {
            console.error(`Object with ID ${objectID} not found.`);
        }
    }

    public getObject(objectID: string): GameObject | undefined {
        return GameObjectManager.objectCollection.get(objectID);
    }

    /**
     * Returns all GameObjects in the collection, optionally filtered by type.
     * @param type Optional class constructor to filter GameObjects by type
     * @returns Array of GameObjects, filtered by the specified type if provided
     */
    public static getAllGameObjects<T extends GameObject>(type?: new (...args: any[]) => T): GameObject[] {
        const allObjects = Array.from(GameObjectManager.objectCollection.values());
        
        if (!type) {
            return allObjects;
        }
        
        // Filter objects by the specified type
        return allObjects.filter(obj => obj instanceof type);
    }
    
    /**
     * Sets the wireframe visibility state for all GameObjects
     * @param isVisible Whether wireframes should be visible
     */
    public static setAllWireframesVisibility(isVisible: boolean): void {
        const allObjects = GameObjectManager.getAllGameObjects();
        
        console.log(`Setting wireframe visibility to ${isVisible ? 'visible' : 'hidden'} for ${allObjects.length} GameObjects`);
        
        // First ensure all wireframes are created
        allObjects.forEach(obj => {
            // Create the wireframe if it doesn't exist yet
            try {
                obj.createCollisionMeshWireframe();
            } catch (error) {
                console.warn(`Failed to create wireframe for object ${obj.getId()}: ${error}`);
            }
        });
        
        // Then set visibility
        allObjects.forEach(obj => {
            // Since we added the setWireframeVisibility method to GameObject,
            // we can now call it directly
            try {
                if (typeof obj.setWireframeVisibility === 'function') {
                    obj.setWireframeVisibility(isVisible);
                } else {
                    console.warn(`Object ${obj.getId()} doesn't have setWireframeVisibility method`);
                }
            } catch (error) {
                console.warn(`Failed to set wireframe visibility for object ${obj.getId()}: ${error}`);
            }
        });
    }
}
