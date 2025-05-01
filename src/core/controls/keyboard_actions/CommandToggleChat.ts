import BaseKeyboardCommand from './BaseKeyboardCommand';
import { UIChatComponent } from '../../ui/ui_components/UIChatComponent';

export default class CommandToggleChat extends BaseKeyboardCommand {
    private chatComponent: UIChatComponent;

    constructor(keyStates: Map<string, boolean>) {
        super(['Enter'], keyStates);
        this.chatComponent = UIChatComponent.getInstance();
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