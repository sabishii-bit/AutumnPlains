import { ConsoleCommand } from '../ConsoleCommand';
import { UIChatComponent } from '../../UIChatComponent';

/**
 * Command to clear the chat log
 */
export class ClearCommand implements ConsoleCommand {
  public readonly name = 'Clear';
  public readonly description = 'Clears the chat log';
  
  execute(): string {
    const chatComponent = UIChatComponent.getInstance();
    chatComponent.clearMessages();
    return "";
  }
} 