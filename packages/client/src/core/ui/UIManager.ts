import { Crosshair } from './components/Crosshair';
import { DebugInfo } from './components/DebugInfo';
import { HUDChatComponent } from './components/chat/HUDChatComponent';
import { MobileChatComponent } from './components/chat/MobileChatComponent';
import { DeviceDetectionService } from '../services/DeviceDetectionService';
import { MobileInputManager } from '../controls/mobile/MobileInputManager';

/**
 * UI Manager
 * Manages all UI components (crosshair, debug info, chat, etc.)
 */
export class UIManager {
    private crosshair: Crosshair;
    private debugInfo: DebugInfo;
    private chat: HUDChatComponent;
    private mobileChat: MobileChatComponent | null = null;
    private deviceDetectionService: DeviceDetectionService;
    private isMobile: boolean;

    constructor() {
        this.deviceDetectionService = DeviceDetectionService.getInstance();
        this.isMobile = this.deviceDetectionService.isMobile();

        // Initialize UI components
        this.crosshair = new Crosshair();
        this.debugInfo = new DebugInfo();
        this.chat = HUDChatComponent.getInstance();

        // Initialize mobile chat on mobile devices
        if (this.isMobile) {
            this.mobileChat = MobileChatComponent.getInstance();
            const mobileInputManager = MobileInputManager.getInstance();
            this.mobileChat.setMobileInputManager(mobileInputManager);
            console.log('[UIManager] Mobile chat initialized');
        }
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
     * Get the mobile chat component (only available on mobile devices)
     */
    public getMobileChat(): MobileChatComponent | null {
        return this.mobileChat;
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
