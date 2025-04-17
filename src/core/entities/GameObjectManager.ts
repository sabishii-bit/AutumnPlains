import { WorldContext } from "../global/world/WorldContext";
import { SceneContext } from "../global/scene/SceneContext";
import GameObject from "./objects/GameObject";
import * as CANNON from 'cannon-es';
import { Scene } from "three";

export class GameObjectManager {
    private static instance: GameObjectManager;
    private static objectCollection: Map<string, GameObject> = new Map<string, GameObject>();
    private sceneContext: Scene = SceneContext.getInstance();
    private worldContext: CANNON.World = WorldContext.getInstance();

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
                this.worldContext.addBody(body);
            }
            
            console.log(`Object with ID ${objectId} added to the game.`);
        } else {
            console.warn(`Object with ID ${objectId} already exists in the collection.`);
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
            // Remove the object's mesh from the scene
            if (objectMesh) {
                this.sceneContext.remove(objectMesh);
            }
            // Remove the object's physics body from the world
            if (objectBody) {
                this.worldContext.removeBody(objectBody);
            }
            // Finally, remove the object from the collection
            GameObjectManager.objectCollection.delete(objectID);
            console.log(`Object with ID ${objectID} has been removed.`);
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
}
