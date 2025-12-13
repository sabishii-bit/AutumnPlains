import { HUDDebugComponent } from './ui_components/HUDDebugComponent';
import { HUDCrosshairsComponent } from './ui_components/HUDCrosshairsComponent';
import { HUDChatComponent } from './ui_components/HUDChatComponent';

export class HUDManager {
    private static uiComponents: Map<string, any> = new Map<string, any>();
    private static initialized: boolean = false;
    private static instance: HUDManager | null = null;

    constructor() {
        // Only initialize components if this is the first instance
        if (!HUDManager.initialized) {
            this.initializeComponents();
            HUDManager.initialized = true;
            HUDManager.instance = this;
        } else if (HUDManager.instance) {
            // Return the existing instance
            return HUDManager.instance;
        }
    }

    // Method to initialize all UI components
    private initializeComponents() {
        const debuggerInfo = new HUDDebugComponent();
        const crosshairs = new HUDCrosshairsComponent();
        const chat = HUDChatComponent.getInstance(); // Use singleton instance

        // Add components to the collection
        HUDManager.uiComponents.set('DebuggerInfo', debuggerInfo);
        HUDManager.uiComponents.set('Crosshairs', crosshairs);
        HUDManager.uiComponents.set('Chat', chat);
    }

    // Method to update all UI components
    public updateUI(deltaTime: number): void {
        HUDManager.uiComponents.forEach(component => {
            if (typeof component.update === 'function') {
                component.update(deltaTime);
            }
        });
    }

    // Method to toggle visibility of specific UI components
    public setVisibility(componentName: string, visible: boolean): void {
        const component = HUDManager.uiComponents.get(componentName);
        if (component && typeof component.setVisibility === 'function') {
            component.setVisibility(visible);
        }
    }

    // Method to get a specific UI component
    public getComponent(componentName: string): any | undefined {
        return HUDManager.uiComponents.get(componentName);
    }

    // Method to get all UI components
    public getAllComponents(): any[] {
        return Array.from(HUDManager.uiComponents.values());
    }
    
    // Add a direct method to access the chat component
    public getChat(): HUDChatComponent | undefined {
        return HUDManager.uiComponents.get('Chat') as HUDChatComponent;
    }
}
