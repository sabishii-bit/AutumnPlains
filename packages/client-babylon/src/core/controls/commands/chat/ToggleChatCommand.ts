import { InputCommand } from '../InputCommand';
import { HUDChatComponent } from '../../../ui/components/chat/HUDChatComponent';

export class ToggleChatCommand extends InputCommand {
    private chatComponent: HUDChatComponent;

    constructor(keyStates: Map<string, boolean>) {
        super(['Enter'], keyStates);
        this.chatComponent = HUDChatComponent.getInstance();
    }

    public execute() {
        // If chat is already focused/active, do nothing - this prevents
        // the Enter key from both toggling and sending messages
        // This is now handled within the chat component's own event listeners
        if (this.chatComponent.isFocused()) return;

        // Toggle chat on
        this.chatComponent.toggleChat(true);
    }

    public release() {
        // No action needed on release
    }
}
