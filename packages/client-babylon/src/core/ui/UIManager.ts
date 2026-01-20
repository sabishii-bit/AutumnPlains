import { Crosshair } from './components/Crosshair';
import { DebugInfo } from './components/DebugInfo';
import { HUDChatComponent } from './components/chat/HUDChatComponent';

/**
 * UI Manager
 * Manages all UI components (crosshair, debug info, chat, etc.)
 */
export class UIManager {
    private crosshair: Crosshair;
    private debugInfo: DebugInfo;
    private chat: HUDChatComponent;

    constructor() {
        // Initialize UI components
        this.crosshair = new Crosshair();
        this.debugInfo = new DebugInfo();
        this.chat = HUDChatComponent.getInstance();
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
     * Get the chat component
     */
    public getChat(): HUDChatComponent {
        return this.chat;
    }

    /**
     * Update all UI components
     */
    public update(deltaTime: number): void {
        this.debugInfo.update(deltaTime);
        this.chat.update(deltaTime);
    }

    /**
     * Dispose all UI components
     */
    public dispose(): void {
        this.crosshair.dispose();
        this.debugInfo.dispose();
    }
}
