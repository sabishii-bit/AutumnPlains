import BaseKeyboardCommand from './BaseKeyboardCommand';
import { GameObjectManager } from "../../entities/GameObjectManager";

export default class CommandToggleWireframe extends BaseKeyboardCommand {
    constructor(keyStates: Map<string, boolean>) {
        super(['KeyT'], keyStates); // Press 'T' to toggle wireframes
    }

    public execute() {
        GameObjectManager.getAllGameObjects().forEach(obj => {
            obj.createCollisionMeshWireframe(); // Ensure wireframe is created
            obj.toggleWireframeVisibility(); // Toggle visibility
        });
    }

    public release() {
        // No action needed on key release
    }

    public update() { }
}
