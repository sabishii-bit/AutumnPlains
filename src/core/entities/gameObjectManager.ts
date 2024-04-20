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

    addGameObject(object: GameObject): void {
        const objectId = object.getID();
        if (!GameObjectManager.objectCollection.has(objectId))
            GameObjectManager.objectCollection.set(objectId, object);
    }

    updateGameObjects(deltaTime: number): void {
        GameObjectManager.objectCollection.forEach(obj => obj.update(deltaTime));
    }

    loadObjects(): void {
        GameObjectManager.objectCollection.forEach((obj, key) => {
            obj.addToScene(this.sceneContext);
            if (obj.getBody()) {
                this.worldContext.addBody(obj.getBody());
            } 
        });
    }
}
