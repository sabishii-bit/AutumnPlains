import { WorldContext } from "../global/world/world";
import { SceneContext } from "../global/scene/scene";
import GameObject from "./objects/gameObject";
import * as CANNON from 'cannon-es';
import { Scene } from "three";

export class GameObjectManager {
    private static objectCollection: Map<string, GameObject> = new Map<string, GameObject>();
    private sceneContext: Scene = SceneContext.getInstance();
    private worldContext: CANNON.World = WorldContext.getInstance();

    constructor() {

    }

    public addGameObject(object: GameObject): void {
        const objectId = object.getID();
        if (!GameObjectManager.objectCollection.has(objectId))
            GameObjectManager.objectCollection.set(objectId, object);
    }

    public updateGameObjects(deltaTime: number): void {
        GameObjectManager.objectCollection.forEach(obj => obj.update(deltaTime));
    }

    public loadObjects(): void {
        GameObjectManager.objectCollection.forEach((obj, key) => {
            obj.addToScene(this.sceneContext);
            if (obj.getBody()) {
                this.worldContext.addBody(obj.getBody());
            } 
        });
    }

    public deleteObject(objectID: string): void {
        const object: GameObject = GameObjectManager.objectCollection.get(objectID);
        const objectMesh = object.getMesh();
        if (object) {
            // Remove the object's mesh from the scene
            if (objectMesh) {
                this.sceneContext.remove(objectMesh);
            }
            // Remove the object's physics body from the world
            if (object.getBody()) {
                this.worldContext.removeBody(object.getBody());
            }
            // Finally, remove the object from the collection
            GameObjectManager.objectCollection.delete(objectID);
            console.log(`Object with ID ${objectID} has been removed.`);
        } else {
            console.error(`Object with ID ${objectID} not found.`);
        }
    }

    public getObject(objectID: string): GameObject {
        if (GameObjectManager.objectCollection.has(objectID)) {
            return GameObjectManager.objectCollection.get(objectID);
        }
    }
}
