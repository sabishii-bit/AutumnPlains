import BaseKeyboardCommand from './BaseKeyboardCommand';
import { GameObjectManager } from "../../entities/GameObjectManager";
import { ImportedModelLoaderService } from "../../services/model_loader/ImportedModelLoaderService";

export default class CommandToggleWireframe extends BaseKeyboardCommand {
    // Track wireframe visibility state globally
    private static wireframeVisibilityState: boolean = false;

    constructor(keyStates: Map<string, boolean>) {
        super(['KeyT'], keyStates); // Press 'T' to toggle wireframes
    }

    public execute() {
        // Toggle global wireframe state
        CommandToggleWireframe.wireframeVisibilityState = !CommandToggleWireframe.wireframeVisibilityState;
        
        console.log(`Toggling wireframes: ${CommandToggleWireframe.wireframeVisibilityState ? 'ON' : 'OFF'}`);
        
        // Use the new centralized methods for toggling wireframes
        // This ensures all wireframes are created and visibility is synced
        GameObjectManager.setAllWireframesVisibility(CommandToggleWireframe.wireframeVisibilityState);
        
        // Synchronize imported model wireframes with the same state
        ImportedModelLoaderService.setWireframeVisibilityState(CommandToggleWireframe.wireframeVisibilityState);
    }

    public release() {
        // No action needed on key release
    }

    public update() { }
    
    /**
     * Get the current global wireframe visibility state
     */
    public static getWireframeVisibilityState(): boolean {
        return CommandToggleWireframe.wireframeVisibilityState;
    }
}
