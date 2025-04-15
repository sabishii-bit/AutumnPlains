import BaseKeyboardCommand from './BaseKeyboardCommand';
import { GameObjectManager } from "../../entities/GameObjectManager";
import { ImportedModelLoaderService } from "../../services/model_loader/ImportedModelLoaderService";

export default class CommandToggleWireframe extends BaseKeyboardCommand {
    constructor(keyStates: Map<string, boolean>) {
        super(['KeyT'], keyStates); // Press 'T' to toggle wireframes
    }

    public execute() {
        // Toggle game object wireframes
        GameObjectManager.getAllGameObjects().forEach(obj => {
            obj.createCollisionMeshWireframe(); // Ensure wireframe is created
            obj.toggleWireframeVisibility(); // Toggle visibility
        });
        
        // Also toggle imported model wireframes
        ImportedModelLoaderService.toggleWireframeVisibility();
    }

    public release() {
        // No action needed on key release
    }

    public update() { }
}
