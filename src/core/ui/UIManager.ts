import { DebuggerInfo } from '../ui/ui_components/debug';
import { Crosshairs } from '../ui/ui_components/crosshairs';

export class UIManager {
    private static uiComponents: Map<string, any> = new Map<string, any>();

    constructor() {
        this.initializeComponents();
    }

    // Method to initialize all UI components
    private initializeComponents() {
        const debuggerInfo = new DebuggerInfo();
        const crosshairs = new Crosshairs();

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
