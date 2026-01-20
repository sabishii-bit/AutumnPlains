import { ConsoleCommand } from '../ConsoleCommand';
import { HUDChatComponent } from '../../chat/HUDChatComponent';
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
      // Mobile chat not yet implemented in client-babylon
      return 'Mobile chat not available';
    } else {
      // Clear desktop chat
      const chatComponent = HUDChatComponent.getInstance();
      chatComponent.clearMessages();
    }

    return "";
  }
}
