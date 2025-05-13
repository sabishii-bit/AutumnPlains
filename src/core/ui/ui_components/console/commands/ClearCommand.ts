import { ConsoleCommand } from '../ConsoleCommand';
import { UIChatComponent } from '../../UIChatComponent';
import { MobileChatComponent } from '../../../../controls/mobile_components/MobileChatComponent';
import { DeviceDetectionService } from '../../../../services/device/DeviceDetectionService';

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
      const chatComponent = UIChatComponent.getInstance();
      chatComponent.clearMessages();
    }
    
    return "";
  }
} 