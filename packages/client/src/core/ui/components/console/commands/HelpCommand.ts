import { ConsoleCommand } from '../ConsoleCommand';
import { CommandRegistry } from '../CommandRegistry';

/**
 * Command to list all available commands
 */
export class HelpCommand implements ConsoleCommand {
  public readonly name = 'help';
  public readonly description = 'Lists all available commands';

  execute(): string {
    const registry = CommandRegistry.getInstance();
    const commands = registry.getAllCommands();

    if (commands.size === 0) {
      return 'No commands available.';
    }

    const commandList: string[] = ['Available commands:'];
    commands.forEach((command, name) => {
      // Skip the help command itself
      if (name === 'help') return;

      commandList.push(`  /${name} - ${command.description}`);
    });

    // If only help command exists, show message
    if (commandList.length === 1) {
      return 'No commands available.';
    }

    return commandList.join('\n');
  }
}
