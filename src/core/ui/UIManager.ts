import { UIDebugComponent } from './ui_components/UIDebugComponent';
import { UICrosshairsComponent } from './ui_components/UICrosshairsComponent';
import { UIChatComponent } from './ui_components/UIChatComponent';

export class UIManager {
    private static uiComponents: Map<string, any> = new Map<string, any>();
    private static initialized: boolean = false;
    private static instance: UIManager | null = null;

    constructor() {
        // Only initialize components if this is the first instance
        if (!UIManager.initialized) {
            this.initializeComponents();
            UIManager.initialized = true;
            UIManager.instance = this;
        } else if (UIManager.instance) {
            // Return the existing instance
            return UIManager.instance;
        }
    }

    // Method to initialize all UI components
    private initializeComponents() {
        const debuggerInfo = new UIDebugComponent();
        const crosshairs = new UICrosshairsComponent();
        const chat = UIChatComponent.getInstance(); // Use singleton instance

        // Add components to the collection
        UIManager.uiComponents.set('DebuggerInfo', debuggerInfo);
        UIManager.uiComponents.set('Crosshairs', crosshairs);
        UIManager.uiComponents.set('Chat', chat);
    }

    // Method to update all UI components
    public updateUI(deltaTime: number): void {
        UIManager.uiComponents.forEach(component => {
            if (typeof component.update === 'function') {
                component.update(deltaTime);
            }
        });
    }

    // Method to toggle visibility of specific UI components
    public setVisibility(componentName: string, visible: boolean): void {
        const component = UIManager.uiComponents.get(componentName);
        if (component && typeof component.setVisibility === 'function') {
            component.setVisibility(visible);
        }
    }

    // Method to get a specific UI component
    public getComponent(componentName: string): any | undefined {
        return UIManager.uiComponents.get(componentName);
    }

    // Method to get all UI components
    public getAllComponents(): any[] {
        return Array.from(UIManager.uiComponents.values());
    }
    
    // Add a direct method to access the chat component
    public getChat(): UIChatComponent | undefined {
        return UIManager.uiComponents.get('Chat') as UIChatComponent;
    }
}
