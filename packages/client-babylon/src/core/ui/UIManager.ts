import { Crosshair } from './components/Crosshair';
import { DebugInfo } from './components/DebugInfo';

/**
 * UI Manager
 * Manages all UI components (crosshair, debug info, etc.)
 */
export class UIManager {
    private crosshair: Crosshair;
    private debugInfo: DebugInfo;

    constructor() {
        // Initialize UI components
        this.crosshair = new Crosshair();
        this.debugInfo = new DebugInfo();
    }

    /**
     * Get the crosshair component
     */
    public getCrosshair(): Crosshair {
        return this.crosshair;
    }

    /**
     * Get the debug info component
     */
    public getDebugInfo(): DebugInfo {
        return this.debugInfo;
    }

    /**
     * Update all UI components
     */
    public update(deltaTime: number): void {
        this.debugInfo.update(deltaTime);
    }

    /**
     * Dispose all UI components
     */
    public dispose(): void {
        this.crosshair.dispose();
        this.debugInfo.dispose();
    }
}
