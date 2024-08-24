import { UIDebugComponent } from './ui_components/UIDebugComponent';
import { UICrosshairsComponent } from './ui_components/UICrosshairsComponent';

export class UIManager {
    private static uiComponents: Map<string, any> = new Map<string, any>();

    constructor() {
        this.initializeComponents();
    }

    // Method to initialize all UI components
    private initializeComponents() {
        const debuggerInfo = new UIDebugComponent();
        const crosshairs = new UICrosshairsComponent();

        // Add components to the collection
        UIManager.uiComponents.set('DebuggerInfo', debuggerInfo);
        UIManager.uiComponents.set('Crosshairs', crosshairs);
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
}
