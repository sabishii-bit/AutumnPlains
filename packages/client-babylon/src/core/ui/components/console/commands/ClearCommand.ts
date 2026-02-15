import { ConsoleCommand } from '../ConsoleCommand';
import { HUDChatComponent } from '../../chat/HUDChatComponent';
import { MobileChatComponent } from '../../chat/MobileChatComponent';
import { DeviceDetectionService } from '../../../../services/DeviceDetectionService';

/**
 * Command to clear the chat log
 */
export class ClearCommand implements ConsoleCommand {
  public readonly name = 'Clear';
  public readonly description = 'Clears the chat log';

  execute(): string {
    const deviceService = DeviceDetectionService.getInstance();

    if (deviceService.isMobile()) {
      // Clear mobile chat
      const mobileChatComponent = MobileChatComponent.getInstance();
      mobileChatComponent.clearMessages();
    } else {
      // Clear desktop chat
      const chatComponent = HUDChatComponent.getInstance();
      chatComponent.clearMessages();
    }

    return "";
  }
}
